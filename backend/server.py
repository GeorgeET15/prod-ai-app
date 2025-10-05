import os
import json
import re
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai
from supabase import create_client, Client
from datetime import datetime

# Logging setup
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Validate environment variables
if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("SUPABASE_URL or SUPABASE_KEY not found in environment")
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment or .env file")

# Initialize Supabase client
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Supabase client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")
    raise

# Flask app setup
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:8080"}})

# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
model = None
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY not found in environment")
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")
        logger.info("Gemini API configured successfully")
    except Exception as e:
        logger.error(f"Failed to configure Gemini API: {e}")
        model = None

# Helper functions
def build_project_str(project: dict) -> str:
    return (
        f"Name: {project.get('name', 'N/A')}, "
        f"Budget: ₹{project.get('total_budget', 0):,.2f}, "
        f"Days in Production: {project.get('days_in_production', 0)}, "
        f"Team: {project.get('team_members', 0)}, "
        f"Scenes Completed: {project.get('scenes_completed', 0)}/{project.get('total_scenes', 1)}"
    )

def build_budgets_str(budgets: list) -> str:
    return "[" + ", ".join(f"{b.get('spent', 0):,.2f}/{b.get('allocated', 0):,.2f}" for b in budgets) + "]"

def build_schedules_str(schedules: list) -> str:
    return "[" + ", ".join(f"Scene {s.get('scene_id', 'N/A')}: {s.get('status', 'N/A')}" for s in schedules) + "]"

def build_invoices_str(invoices: list) -> str:
    return "[" + ", ".join(f"{i.get('vendor', 'N/A')}: {i.get('delay_days', 0)} days delay" for i in invoices) + "]"

def build_risk_prompt(project, budgets, schedules, invoices) -> str:
    return f"""
    Analyze this film production data and identify risks.
    If no risks are present, return an empty JSON array [].

    Project: {build_project_str(project)}
    Budgets: {build_budgets_str(budgets)}
    Schedules: {build_schedules_str(schedules)}
    Invoices: {build_invoices_str(invoices)}

    Return only a JSON array. Do not include any text outside JSON. Example:

    [
      {{
        "type": "warning",
        "title": "Budget Overrun",
        "description": "Detailed explanation",
        "confidence": 85,
        "impact": "Financial risk"
      }}
    ]
    """

def clean_response_text(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n", "", text)
    if text.endswith("```"):
        text = re.sub(r"\n```$", "", text)
    return text

def validate_risks(risks):
    if not isinstance(risks, list):
        return False
    for r in risks:
        if not isinstance(r, dict):
            return False
        req = {"type", "title", "description", "confidence", "impact"}
        if not req.issubset(r.keys()):
            return False
    return True

# Routes
@app.route("/projects", methods=["GET"])
def get_projects():
    try:
        # Fetch all projects
        projects_response = supabase.table("projects").select(
            "id, name, total_budget, days_in_production, team_members, scenes_completed, total_scenes, start_date, end_date"
        ).execute()

        if not projects_response.data:
            logger.warning("No projects found")
            return jsonify({"error": "No projects found", "details": "No data returned from projects table"}), 404

        projects = [
            {
                "id": p["id"],
                "name": p["name"] or "Unnamed Project",
                "total_budget": p["total_budget"] or 0,
                "days_in_production": p["days_in_production"] or 0,
                "team_members": p["team_members"] or 0,
                "scenes_completed": p["scenes_completed"] or 0,
                "total_scenes": p["total_scenes"] or 1,
                "start_date": p["start_date"] or "",
                "end_date": p["end_date"] or ""
            } for p in projects_response.data
        ]

        return jsonify(projects), 200

    except Exception as e:
        logger.error(f"Error fetching projects: {str(e)}")
        return jsonify({"error": "Failed to fetch projects", "details": str(e)}), 500

@app.route("/project-data/<project_id>", methods=["GET"])
def get_project_data(project_id):
    try:
        # Fetch project details
        project_response = supabase.table("projects").select(
            "id, name, total_budget, days_in_production, team_members, scenes_completed, total_scenes, start_date, end_date"
        ).eq("id", project_id).execute()

        if not project_response.data:
            logger.warning(f"No project found for id: {project_id}")
            return jsonify({"error": "Project not found", "details": f"No project with id {project_id}"}), 404

        project = {
            "id": project_response.data[0]["id"],
            "name": project_response.data[0]["name"] or "Unnamed Project",
            "total_budget": project_response.data[0]["total_budget"] or 0,
            "days_in_production": project_response.data[0]["days_in_production"] or 0,
            "team_members": project_response.data[0]["team_members"] or 0,
            "scenes_completed": project_response.data[0]["scenes_completed"] or 0,
            "total_scenes": project_response.data[0]["total_scenes"] or 1,
            "start_date": project_response.data[0]["start_date"] or "",
            "end_date": project_response.data[0]["end_date"] or ""
        }

        # Fetch budgets
        budgets_response = supabase.table("budgets").select(
            "id, department, allocated, spent"
        ).eq("project_id", project_id).execute()
        
        budgets = [
            {
                "id": b["id"],
                "department": b["department"] or "Unknown",
                "allocated": b["allocated"] or 0,
                "spent": b["spent"] or 0
            } for b in budgets_response.data or []
        ]

        # Fetch schedules
        schedules_response = supabase.table("schedules").select(
            "id, scene_id, description, planned_start, status"
        ).eq("project_id", project_id).order("planned_start", desc=False).limit(5).execute()
        
        schedules = [
            {
                "id": s["id"],
                "scene": f"Scene {s['scene_id']}",
                "location": s.get("description", "").split(" at ")[-1] if " at " in s.get("description", "") else s.get("description", "N/A"),
                "status": s["status"],
                "date": datetime.fromisoformat(s["planned_start"].replace("Z", "+00:00")).strftime("%d/%m/%Y") if s.get("planned_start") else "N/A"
            } for s in schedules_response.data or []
        ]

        # Fetch invoices
        invoices_response = supabase.table("invoices").select(
            "id, vendor, amount, due_date, status, delay_days"
        ).eq("project_id", project_id).order("due_date", desc=True).limit(5).execute()
        
        invoices = [
            {
                "id": i["id"],
                "vendor": i["vendor"] or "Unknown",
                "amount": i["amount"] or 0,
                "date": datetime.fromisoformat(i["due_date"].replace("Z", "+00:00")).strftime("%d/%m/%Y") if i.get("due_date") else "N/A",
                "status": i["status"],
                "delay_days": i["delay_days"] or 0
            } for i in invoices_response.data or []
        ]

        # Fetch scripts
        scripts_response = supabase.table("scripts").select(
            "id, version, date, status, author"
        ).eq("project_id", project_id).order("date", desc=True).limit(5).execute()
        
        scripts = [
            {
                "id": s["id"],
                "version": s["version"] or "N/A",
                "date": datetime.fromisoformat(s["date"].replace("Z", "+00:00")).strftime("%d/%m/%Y") if s.get("date") else "N/A",
                "status": s["status"],
                "author": s["author"] or "Unknown"
            } for s in scripts_response.data or []
        ]

        # Fetch crew
        crew_response = supabase.table("crew").select(
            "id, name, role, department, status, contact"
        ).eq("project_id", project_id).limit(10).execute()
        
        crew = [
            {
                "id": c["id"],
                "name": c["name"] or "Unknown",
                "role": c["role"] or "N/A",
                "department": c["department"] or "N/A",
                "status": c["status"] or "Not Started",
                "contact": c["contact"] or "N/A"
            } for c in crew_response.data or []
        ]

        # Fetch locations
        locations_response = supabase.table("locations").select(
            "id, name, type, cost, status"
        ).eq("project_id", project_id).limit(10).execute()
        
        locations = [
            {
                "id": l["id"],
                "name": l["name"] or "Unknown",
                "type": l["type"] or "N/A",
                "cost": l["cost"] or 0,
                "status": l["status"] or "Not Secured"
            } for l in locations_response.data or []
        ]

        # Fetch attendance
        attendance_response = supabase.table("attendance").select(
            "id, date, present, absent, late, total"
        ).eq("project_id", project_id).order("date", desc=True).limit(10).execute()
        
        attendance = [
            {
                "id": a["id"],
                "date": datetime.fromisoformat(a["date"].replace("Z", "+00:00")).strftime("%d/%m/%Y") if a.get("date") else "N/A",
                "present": a["present"] or 0,
                "absent": a["absent"] or 0,
                "late": a["late"] or 0,
                "total": a["total"] or 0
            } for a in attendance_response.data or []
        ]

        # Fetch departments
        departments_response = supabase.table("departments").select(
            "id, name, head_count, lead, budget, status"
        ).eq("project_id", project_id).execute()
        
        departments = [
            {
                "id": d["id"],
                "name": d["name"] or "Unknown",
                "head_count": d["head_count"] or 0,
                "lead": d["lead"] or "N/A",
                "budget": d["budget"] or 0,
                "status": d["status"] or "N/A"
            } for d in departments_response.data or []
        ]

        # Fetch equipment
        equipment_response = supabase.table("equipment").select(
            "id, name, unit, status, condition"
        ).eq("project_id", project_id).limit(10).execute()
        
        equipment = [
            {
                "id": e["id"],
                "name": e["name"] or "Unknown",
                "unit": e["unit"] or "N/A",
                "status": e["status"] or "N/A",
                "condition": e["condition"] or "N/A"
            } for e in equipment_response.data or []
        ]

        # Fetch milestones
        milestones_response = supabase.table("milestones").select(
            "id, milestone, target_date, status, progress"
        ).eq("project_id", project_id).order("target_date", desc=False).limit(10).execute()
        
        milestones = [
            {
                "id": m["id"],
                "milestone": m["milestone"] or "N/A",
                "target_date": datetime.fromisoformat(m["target_date"].replace("Z", "+00:00")).strftime("%d/%m/%Y") if m.get("target_date") else "N/A",
                "status": m["status"] or "Not Started",
                "progress": m["progress"] or 0
            } for m in milestones_response.data or []
        ]

        # Fetch payroll
        payroll_response = supabase.table("payroll").select(
            "id, category, amount, status, due_date"
        ).eq("project_id", project_id).order("due_date", desc=True).limit(10).execute()
        
        payroll = [
            {
                "id": p["id"],
                "category": p["category"] or "N/A",
                "amount": p["amount"] or 0,
                "status": p["status"] or "Pending",
                "due_date": datetime.fromisoformat(p["due_date"].replace("Z", "+00:00")).strftime("%d/%m/%Y") if p.get("due_date") else "N/A"
            } for p in payroll_response.data or []
        ]

        response = {
            "project": project,
            "budgets": budgets,
            "schedules": schedules,
            "invoices": invoices,
            "scripts": scripts,
            "crew": crew,
            "locations": locations,
            "attendance": attendance,
            "departments": departments,
            "equipment": equipment,
            "milestones": milestones,
            "payroll": payroll
        }

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error fetching project data: {str(e)}")
        return jsonify({"error": "Failed to fetch project data", "details": str(e)}), 500

@app.route("/predict-risks", methods=["POST"])
def predict_risks():
    try:
        data = request.get_json()
        logger.debug(f"Request data: {json.dumps(data, indent=2)}")
        if not data:
            logger.warning("No data provided")
            return jsonify({"error": "No data provided"}), 400

        project = data.get("project", {})
        budgets = data.get("budgets", [])
        schedules = data.get("schedules", [])
        invoices = data.get("invoices", [])

        if not model:
            logger.warning("Gemini model unavailable")
            return jsonify([]), 200  # no AI, no risks

        prompt = build_risk_prompt(project, budgets, schedules, invoices)
        response = model.generate_content(prompt)
        raw = response.text
        logger.debug(f"Gemini raw response: {raw}")

        cleaned = clean_response_text(raw)
        logger.debug(f"Cleaned response: {cleaned}")

        try:
            risks = json.loads(cleaned)
            if not validate_risks(risks):
                logger.warning("Invalid or empty risks")
                return jsonify([]), 200
            return jsonify(risks), 200
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed: {e}")
            return jsonify([]), 200
        except Exception as e:
            logger.error(f"Validation failed: {e}")
            return jsonify([]), 200

    except Exception as e:
        logger.error(f"Unexpected error in predict_risks: {str(e)}")
        return jsonify({"error": "Failed to predict risks", "details": str(e)}), 500

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        user_message = data.get("message")
        project_id = data.get("project_id")  # frontend sends only message + project_id

        if not user_message:
            return jsonify({"error": "No message provided"}), 400
        if not project_id:
            return jsonify({"error": "No project_id provided"}), 400
        if not model:
            return jsonify({"reply": "AI unavailable, please try later."}), 200

        # --- Fetch all project data from DB ---
        project_data_resp = get_project_data(project_id)
        if project_data_resp[1] != 200:
            return project_data_resp  # error JSON already handled

        project_data = project_data_resp[0].json  # unwrap Flask Response JSON

        project = project_data.get("project", {})
        budgets = project_data.get("budgets", [])
        schedules = project_data.get("schedules", [])
        invoices = project_data.get("invoices", [])
        crew = project_data.get("crew", [])
        locations = project_data.get("locations", [])
        attendance = project_data.get("attendance", [])
        departments = project_data.get("departments", [])
        equipment = project_data.get("equipment", [])
        milestones = project_data.get("milestones", [])
        payroll = project_data.get("payroll", [])
        scripts = project_data.get("scripts", [])

        # --- Build context for Gemini ---
        context = f"""
        You are a Virtual Production Controller AI.
        Guidelines:
        - Keep answers short and clear (2–4 sentences).
        - Use simple language.
        - Base answers only on the given project data.

        Project: {build_project_str(project)}
        Budgets: {build_budgets_str(budgets)}
        Schedules: {build_schedules_str(schedules)}
        Invoices: {build_invoices_str(invoices)}
        Crew: {len(crew)} members
        Locations: {len(locations)} locations
        Attendance: latest {attendance[0] if attendance else "N/A"}
        Departments: {len(departments)} total
        Equipment: {len(equipment)} items
        Milestones: {len(milestones)} tracked
        Payroll: {len(payroll)} entries
        Scripts: {len(scripts)} versions

        User question: {user_message}
        """

        # --- Query Gemini ---
        response = model.generate_content(context)
        reply = response.text.strip()

        return jsonify({"reply": reply}), 200

    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        return jsonify({"error": "Failed to process chat request", "details": str(e)}), 500


# Run
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)