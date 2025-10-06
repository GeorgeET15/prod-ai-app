import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import InstructionsAccordion from "./InstructionsAccordion";
import { schema } from "@/schema/schema";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedRow {
  [key: string]: any;
}

const UploadDialog: React.FC<UploadDialogProps> = ({ open, onOpenChange }) => {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [matchedTable, setMatchedTable] = useState<string | null>(null);
  const [manualTable, setManualTable] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const projectId = localStorage.getItem("selectedProjectId");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) {
        console.log("No file selected");
        toast.error("No file selected.");
        return;
      }

      if (!projectId) {
        console.log("No project ID found in localStorage");
        toast.error("No project selected. Please select a project first.");
        return;
      }

      setFileName(file.name);
      try {
        const text = await file.text();
        console.log("Raw file content:", text);

        const workbook = XLSX.read(text, {
          type: "string",
          raw: true,
          cellDates: true,
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, {
          header: 1,
          blankrows: false,
        }) as ParsedRow[];

        console.log("Raw JSON data:", jsonData);

        if (!jsonData.length || !jsonData[0].length) {
          toast.error("File is empty or has no valid data.");
          setParsedData([]);
          setHeaders([]);
          return;
        }

        const parsedHeaders = (jsonData[0] as string[])
          .map((h) => h?.trim())
          .filter((h) => h);
        console.log("Parsed headers:", parsedHeaders);

        const rows = jsonData
          .slice(1)
          .filter(
            (row) =>
              row &&
              row.some(
                (val: any) => val !== null && val !== undefined && val !== ""
              )
          )
          .map((row) => {
            const rowObj: ParsedRow = {};
            parsedHeaders.forEach((header, idx) => {
              rowObj[header] = row[idx] === "" ? null : row[idx];
            });
            return rowObj;
          });

        console.log("Parsed rows:", rows);

        setHeaders(parsedHeaders);
        setParsedData(rows);

        const matched = schema.reduce(
          (best, table) => {
            const tableColumns = table.columns.map((col) => col.name);
            const matchCount = parsedHeaders.filter((h) =>
              tableColumns.includes(h)
            ).length;
            const requiredColumns = table.columns
              .filter((col) => col.required && col.name !== "project_id")
              .map((col) => col.name);
            const hasRequired = requiredColumns.every((col) =>
              parsedHeaders.includes(col)
            );
            console.log(
              `Table: ${table.table_name}, Headers: ${parsedHeaders}, MatchCount: ${matchCount}, HasRequired: ${hasRequired}, RequiredColumns: ${requiredColumns}`
            );
            if (matchCount > (best?.matchCount || 0)) {
              return { table: table.table_name, matchCount };
            }
            return best;
          },
          { table: null, matchCount: 0 } as {
            table: string | null;
            matchCount: number;
          }
        );

        console.log("Matched table:", matched);
        setMatchedTable(matched.table);
        setManualTable(matched.table || "");
      } catch (error) {
        console.error("Parsing error:", error);
        toast.error("Error parsing file: " + (error as Error).message);
        setParsedData([]);
        setHeaders([]);
      }
    },
    [projectId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    multiple: false,
  });

  const isValidRow = (row: ParsedRow, tableName: string) => {
    const tableSchema = schema.find((s) => s.table_name === tableName);
    if (!tableSchema) return false;
    const requiredColumns = tableSchema.columns
      .filter((col) => col.required && col.name !== "project_id")
      .map((col) => col.name);
    const invalidFields = requiredColumns.filter(
      (col) => row[col] === undefined || row[col] === null || row[col] === ""
    );
    if (invalidFields.length) {
      console.log(
        `Invalid row:`,
        row,
        `Missing or empty fields: ${invalidFields}`
      );
    }
    return invalidFields.length === 0;
  };

  const coerceValue = (value: any, type: string) => {
    if (value === undefined || value === null || value === "") return null;
    switch (type) {
      case "integer":
      case "bigint":
        const num = parseInt(value);
        return isNaN(num) ? null : num;
      case "numeric":
        const float = parseFloat(value);
        return isNaN(float) ? null : float;
      case "date":
      case "timestamp without time zone":
      case "timestamp with time zone":
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
      default:
        return value.toString();
    }
  };

  const handleUpload = async () => {
    console.log("Project ID:", projectId);
    if (!projectId) {
      toast.error("No project selected. Please select a project first.");
      return;
    }

    const targetTable = manualTable || matchedTable;
    if (!targetTable || !parsedData.length) {
      toast.error("No valid table selected or no data to upload.");
      return;
    }

    setIsUploading(true);
    try {
      const tableSchema = schema.find((s) => s.table_name === targetTable);
      if (!tableSchema) throw new Error("Table schema not found");

      const validRows = parsedData
        .filter((row) => isValidRow(row, targetTable))
        .map((row) => {
          const insertRow: ParsedRow = { project_id: projectId };
          tableSchema.columns.forEach((col) => {
            if (col.name === "project_id" && col.is_nullable === "NO") {
              insertRow[col.name] = projectId;
            } else if (col.name !== "id" && col.name !== "created_at") {
              insertRow[col.name] = coerceValue(row[col.name], col.type);
            }
          });
          return insertRow;
        });

      console.log("Valid rows to insert:", validRows);
      if (validRows.length === 0) {
        toast.error("No valid rows to insert. Check console for details.");
        setIsUploading(false);
        return;
      }

      const { data, error } = await supabase
        .from(targetTable)
        .insert(validRows);
      if (error) throw error;

      toast.success(
        `Uploaded ${validRows.length} rows to ${targetTable} successfully!`
      );
      setParsedData([]);
      setMatchedTable(null);
      setManualTable("");
      setHeaders([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed: " + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Data to Database</DialogTitle>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Drop a CSV file. Data will be matched to a database table and
                inserted if valid. Project ID: {projectId || "None"}
              </p>
              <Button
                variant="outline"
                onClick={() => setInstructionsOpen(true)}
              >
                How to Create CSV
              </Button>
            </div>
          </DialogHeader>

          {!parsedData.length && !headers.length ? (
            <div
              {...getRootProps()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary"
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p className="text-muted-foreground">Drop the file here ...</p>
              ) : (
                <p className="text-muted-foreground">
                  Drag & drop a CSV file here, or click to select
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  Preview: {fileName} ({parsedData.length} rows){" "}
                  {matchedTable ? `- Matched to: ${matchedTable}` : ""}
                </span>
                <div className="space-x-2 flex items-center">
                  <Select value={manualTable} onValueChange={setManualTable}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select table" />
                    </SelectTrigger>
                    <SelectContent>
                      {schema.map((table) => (
                        <SelectItem
                          key={table.table_name}
                          value={table.table_name}
                        >
                          {table.table_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setParsedData([]);
                      setHeaders([]);
                      setMatchedTable(null);
                      setManualTable("");
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading || !manualTable || !projectId}
                  >
                    {isUploading
                      ? "Uploading..."
                      : `Upload to ${manualTable || matchedTable || "table"}`}
                  </Button>
                </div>
              </div>

              {headers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        {headers.map((header, idx) => (
                          <th
                            key={idx}
                            className="border border-gray-300 p-2 text-left text-black"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.length > 0 ? (
                        parsedData.slice(0, 10).map((row, idx) => (
                          <tr
                            key={idx}
                            className={
                              isValidRow(
                                row,
                                manualTable || matchedTable || "invoices"
                              )
                                ? "bg-white"
                                : "bg-red-50"
                            }
                          >
                            {headers.map((header, i) => (
                              <td
                                key={i}
                                className="border border-gray-300 p-2 text-black"
                              >
                                {row[header] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={headers.length}
                            className="border border-gray-300 p-2 text-center text-muted-foreground"
                          >
                            No valid rows to display
                          </td>
                        </tr>
                      )}
                      {parsedData.length > 10 && (
                        <tr>
                          <td
                            colSpan={headers.length}
                            className="border border-gray-300 p-2 text-center text-muted-foreground"
                          >
                            ... and {parsedData.length - 10} more rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No data to preview
                </p>
              )}

              {!matchedTable && parsedData.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    Warning: No table matches the uploaded data. Ensure column
                    headers match a database table's schema (e.g., invoices:
                    vendor, amount, status, date_issued). Select a table
                    manually to proceed.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>How to Create CSV Files</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none">
            <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>How to Create CSV Files</DialogTitle>
                </DialogHeader>
                <InstructionsAccordion />
                <div className="flex justify-end mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setInstructionsOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setInstructionsOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UploadDialog;
