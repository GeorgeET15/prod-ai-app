import React from "react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { schema } from "@/schema/schema";

const InstructionsAccordion: React.FC = () => {
  const handleCopy = (csv: string) => {
    navigator.clipboard.writeText(csv).then(() => {
      toast.success("Example CSV copied to clipboard");
    });
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      {schema.map((table) => {
        const required = table.columns
          .filter((c) => c.required && c.name !== "project_id")
          .map((c) => c.name);
        const optional = table.columns
          .filter((c) => !c.required && c.name !== "project_id")
          .map((c) => c.name);

        const exampleCSV = generateExampleCSV(table);

        return (
          <AccordionItem key={table.table_name} value={table.table_name}>
            <AccordionTrigger className="capitalize">
              {table.table_name}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                <p>
                  <strong>Required columns:</strong>{" "}
                  {required.length ? required.join(", ") : "None"}
                </p>
                <p>
                  <strong>Optional columns:</strong>{" "}
                  {optional.length ? optional.join(", ") : "None"}
                </p>
                <p>
                  <strong>Notes:</strong> Do not include <code>id</code>,{" "}
                  <code>project_id</code>, or <code>created_at</code> in CSV.
                  They are handled automatically.
                </p>

                <div className="mt-2">
                  <div className="flex justify-between items-center">
                    <p className="font-medium">Example CSV:</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(exampleCSV)}
                    >
                      Copy
                    </Button>
                  </div>
                  <pre className="bg-black p-2 rounded text-xs overflow-x-auto mt-1">
                    {exampleCSV}
                  </pre>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

export default InstructionsAccordion;

// --- helper ---
const generateExampleCSV = (table: any): string => {
  const headers = table.columns
    .filter((c: any) => c.required && c.name !== "project_id")
    .map((c: any) => c.name)
    .concat(
      table.columns
        .filter((c: any) => !c.required && c.name !== "project_id")
        .map((c: any) => c.name)
    );

  if (!headers.length) return "No columns required.\n";

  // create fake values
  const sampleRow = headers.map((h: string) => {
    const lower = h.toLowerCase();
    if (lower.includes("date")) return "2025-10-01";
    if (
      lower.includes("amount") ||
      lower.includes("budget") ||
      lower.includes("cost")
    )
      return "1000";
    if (lower.includes("status")) return "Pending";
    if (lower.includes("name")) return "Sample Name";
    if (lower.includes("role")) return "Director";
    if (lower.includes("department")) return "Production";
    if (lower.includes("vendor")) return "Vendor Inc.";
    return "value";
  });

  return `${headers.join(",")}\n${sampleRow.join(",")}`;
};
