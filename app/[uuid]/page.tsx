"use client";

import type React from "react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Download,
  Copy,
  ArrowLeft,
  Save,
  Trash2,
  Pencil,
  PlusCircle,
  Code,
  Eye,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import {
  fetchSchemaDetail,
  updateSchema,
  deleteSchema,
  renameSchema,
} from "@/lib/api";
import type { SchemaDetail } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type PropertyType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array";

// Allowed properties for each type
const TYPE_ALLOWED_PROPERTIES: Record<PropertyType, string[]> = {
  string: [
    "title",
    "description",
    "default",
    "enum",
    "minLength",
    "maxLength",
    "pattern",
    "format",
  ],
  number: [
    "title",
    "description",
    "default",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
  ],
  integer: [
    "title",
    "description",
    "default",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
  ],
  boolean: ["title", "description", "default"],
  object: [
    "title",
    "description",
    "properties",
    "required",
    "additionalProperties",
  ],
  array: [
    "title",
    "description",
    "items",
    "minItems",
    "maxItems",
    "uniqueItems",
  ],
};

// String formats for string type
const STRING_FORMATS = [
  { value: "none", label: "None" },
  { value: "email", label: "Email" },
  { value: "uri", label: "URI" },
  { value: "date-time", label: "Date-Time" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "ipv4", label: "IPv4" },
  { value: "ipv6", label: "IPv6" },
  { value: "uuid", label: "UUID" },
];

interface PropertyItemProps {
  propKey: string;
  prop: {
    type: PropertyType;
    title?: string;
    description?: string;
    default?: any;
    enum?: string[];
    minItems?: number;
    maxItems?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    format?: string;
    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;
    multipleOf?: number;
    uniqueItems?: boolean;
    items?: {
      type?: PropertyType;
      [key: string]: any;
    };
    [key: string]: any;
  };
  schema: {
    properties: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
  onRemoveProperty: (key: string) => void;
  onUpdateProperty: (key: string, field: string, value: any) => void;
  onRenameProperty: (oldKey: string, newKey: string) => void;
  onToggleRequired: (key: string) => void;
  onNavigateToPath: (path: string, label: string) => void;
  currentPath: string;
  index: number;
}

// Renders a single property item with all its editable fields
function PropertyItem({
  propKey,
  prop,
  schema,
  onRemoveProperty,
  onUpdateProperty,
  onRenameProperty,
  onToggleRequired,
  onNavigateToPath,
  currentPath,
  index,
}: PropertyItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tempKey, setTempKey] = useState(propKey);
  const [isEditing, setIsEditing] = useState(false);
  const lastValueRef = useRef(propKey);

  // Sync tempKey with propKey when not editing
  useEffect(() => {
    if (!isEditing) {
      setTempKey(propKey);
      lastValueRef.current = propKey;
    }
  }, [propKey, isEditing]);

  // Handle property key change (rename)
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setTempKey(newKey);
    setIsEditing(true);
    lastValueRef.current = newKey;
  };

  // Commit rename on Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (tempKey.trim() !== "" && tempKey !== propKey) {
        onRenameProperty(propKey, tempKey);
      }
      setIsEditing(false);
      inputRef.current?.blur();
    }
  };

  // Commit or revert rename on blur
  const handleBlur = () => {
    if (tempKey.trim() !== "" && tempKey !== propKey) {
      onRenameProperty(propKey, tempKey);
    } else if (tempKey.trim() === "") {
      setTempKey(propKey);
    }
    setIsEditing(false);
  };

  // Navigate to nested object/array schema
  const handleNavigate = () => {
    const newPath = currentPath ? `${currentPath}.${propKey}` : propKey;
    onNavigateToPath(newPath, prop.title || propKey);
  };

  // Render property editor UI
  return (
    <div className="p-2 border border-neutral-200 dark:border-neutral-800 rounded-md relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6"
        onClick={() => onRemoveProperty(propKey)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>

      <div className="grid grid-cols-2 gap-2 pr-6">
        {/* Property name (key) */}
        <div className="space-y-1">
          <Label htmlFor={`${propKey}-name`} className="text-xs">
            Property Name
          </Label>
          <Input
            id={`${propKey}-name`}
            key={`property-name-input-${index}`}
            value={tempKey}
            onChange={handleKeyChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="h-8 text-sm"
            ref={inputRef}
          />
        </div>

        {/* Property title */}
        <div className="space-y-1">
          <Label htmlFor={`${propKey}-title`} className="text-xs">
            Display Title
          </Label>
          <Input
            id={`${propKey}-title`}
            value={prop.title || ""}
            onChange={(e) => onUpdateProperty(propKey, "title", e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Property type */}
        <div className="space-y-1">
          <Label htmlFor={`${propKey}-type`} className="text-xs">
            Type
          </Label>
          <Select
            value={prop.type}
            onValueChange={(value) =>
              onUpdateProperty(propKey, "type", value as PropertyType)
            }
          >
            <SelectTrigger id={`${propKey}-type`} className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="string">String</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="integer">Integer</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
              <SelectItem value="object">Object</SelectItem>
              <SelectItem value="array">Array</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Required checkbox */}
        <div className="flex items-center space-x-2 h-8">
          <Checkbox
            id={`${propKey}-required`}
            checked={schema.required?.includes(propKey) || false}
            onCheckedChange={() => onToggleRequired(propKey)}
          />
          <Label htmlFor={`${propKey}-required`} className="text-xs">
            Required
          </Label>
        </div>

        {/* String type fields */}
        {prop.type === "string" && (
          <>
            <div className="space-y-1 col-span-2">
              <Label htmlFor={`${propKey}-enum`} className="text-xs">
                Enum Values (comma separated)
              </Label>
              <Input
                id={`${propKey}-enum`}
                value={prop.enum ? prop.enum.join(", ") : ""}
                onChange={(e) => {
                  const enumValues = e.target.value
                    ? e.target.value.split(",").map((v) => v.trim())
                    : undefined;
                  onUpdateProperty(propKey, "enum", enumValues);
                }}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`${propKey}-description`} className="text-xs">
                Description
              </Label>
              <Input
                id={`${propKey}-description`}
                value={prop.description || ""}
                onChange={(e) =>
                  onUpdateProperty(propKey, "description", e.target.value)
                }
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`${propKey}-default`} className="text-xs">
                Default Value
              </Label>
              <Input
                id={`${propKey}-default`}
                value={prop.default?.toString() || ""}
                onChange={(e) =>
                  onUpdateProperty(propKey, "default", e.target.value)
                }
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`${propKey}-minLength`} className="text-xs">
                Min Length
              </Label>
              <Input
                id={`${propKey}-minLength`}
                type="number"
                min="0"
                value={prop.minLength || ""}
                onChange={(e) =>
                  onUpdateProperty(
                    propKey,
                    "minLength",
                    e.target.value ? Number.parseInt(e.target.value) : undefined
                  )
                }
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`${propKey}-maxLength`} className="text-xs">
                Max Length
              </Label>
              <Input
                id={`${propKey}-maxLength`}
                type="number"
                min="0"
                value={prop.maxLength || ""}
                onChange={(e) =>
                  onUpdateProperty(
                    propKey,
                    "maxLength",
                    e.target.value ? Number.parseInt(e.target.value) : undefined
                  )
                }
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`${propKey}-pattern`} className="text-xs">
                Pattern (regex)
              </Label>
              <Input
                id={`${propKey}-pattern`}
                value={prop.pattern || ""}
                onChange={(e) =>
                  onUpdateProperty(
                    propKey,
                    "pattern",
                    e.target.value || undefined
                  )
                }
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`${propKey}-format`} className="text-xs">
                Format
              </Label>
              <Select
                value={prop.format || "none"}
                onValueChange={(value) =>
                  onUpdateProperty(
                    propKey,
                    "format",
                    value === "none" ? undefined : value
                  )
                }
              >
                <SelectTrigger id={`${propKey}-format`} className="h-8 text-sm">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {STRING_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Number/integer type fields */}
        {(prop.type === "number" || prop.type === "integer") && (
          <>
            <div className="space-y-1">
              <Label htmlFor={`${propKey}-description`} className="text-xs">
                Description
              </Label>
              <Input
                id={`${propKey}-description`}
                value={prop.description || ""}
                onChange={(e) =>
                  onUpdateProperty(propKey, "description", e.target.value)
                }
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`${propKey}-default`} className="text-xs">
                Default Value
              </Label>
              <Input
                id={`${propKey}-default`}
                type="number"
                value={prop.default?.toString() || ""}
                onChange={(e) => {
                  const value = e.target.value
                    ? prop.type === "integer"
                      ? Number.parseInt(e.target.value)
                      : Number.parseFloat(e.target.value)
                    : undefined;
                  onUpdateProperty(propKey, "default", value);
                }}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`${propKey}-minimum`} className="text-xs">
                Minimum
              </Label>
              <Input
                id={`${propKey}-minimum`}
                type="number"
                value={prop.minimum?.toString() || ""}
                onChange={(e) => {
                  const value = e.target.value
                    ? prop.type === "integer"
                      ? Number.parseInt(e.target.value)
                      : Number.parseFloat(e.target.value)
                    : undefined;
                  onUpdateProperty(propKey, "minimum", value);
                }}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`${propKey}-maximum`} className="text-xs">
                Maximum
              </Label>
              <Input
                id={`${propKey}-maximum`}
                type="number"
                value={prop.maximum?.toString() || ""}
                onChange={(e) => {
                  const value = e.target.value
                    ? prop.type === "integer"
                      ? Number.parseInt(e.target.value)
                      : Number.parseFloat(e.target.value)
                    : undefined;
                  onUpdateProperty(propKey, "maximum", value);
                }}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label
                htmlFor={`${propKey}-exclusiveMinimum`}
                className="text-xs"
              >
                Exclusive Minimum
              </Label>
              <Input
                id={`${propKey}-exclusiveMinimum`}
                type="number"
                value={prop.exclusiveMinimum?.toString() || ""}
                onChange={(e) => {
                  const value = e.target.value
                    ? prop.type === "integer"
                      ? Number.parseInt(e.target.value)
                      : Number.parseFloat(e.target.value)
                    : undefined;
                  onUpdateProperty(propKey, "exclusiveMinimum", value);
                }}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label
                htmlFor={`${propKey}-exclusiveMaximum`}
                className="text-xs"
              >
                Exclusive Maximum
              </Label>
              <Input
                id={`${propKey}-exclusiveMaximum`}
                type="number"
                value={prop.exclusiveMaximum?.toString() || ""}
                onChange={(e) => {
                  const value = e.target.value
                    ? prop.type === "integer"
                      ? Number.parseInt(e.target.value)
                      : Number.parseFloat(e.target.value)
                    : undefined;
                  onUpdateProperty(propKey, "exclusiveMaximum", value);
                }}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`${propKey}-multipleOf`} className="text-xs">
                Multiple Of
              </Label>
              <Input
                id={`${propKey}-multipleOf`}
                type="number"
                min="0"
                step={prop.type === "integer" ? "1" : "0.1"}
                value={prop.multipleOf?.toString() || ""}
                onChange={(e) => {
                  const value = e.target.value
                    ? prop.type === "integer"
                      ? Number.parseInt(e.target.value)
                      : Number.parseFloat(e.target.value)
                    : undefined;
                  onUpdateProperty(propKey, "multipleOf", value);
                }}
                className="h-8 text-sm"
              />
            </div>
          </>
        )}

        {/* Boolean type fields */}
        {prop.type === "boolean" && (
          <>
            <div className="space-y-1">
              <Label htmlFor={`${propKey}-description`} className="text-xs">
                Description
              </Label>
              <Input
                id={`${propKey}-description`}
                value={prop.description || ""}
                onChange={(e) =>
                  onUpdateProperty(propKey, "description", e.target.value)
                }
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`${propKey}-default`} className="text-xs">
                Default Value
              </Label>
              <Select
                value={prop.default?.toString() || "false"}
                onValueChange={(value) =>
                  onUpdateProperty(propKey, "default", value === "true")
                }
              >
                <SelectTrigger
                  id={`${propKey}-default`}
                  className="h-8 text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Object type fields */}
        {prop.type === "object" && (
          <>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Object Properties</Label>
              <div className="text-xs text-muted-foreground">
                {Object.keys(prop.properties || {}).length > 0
                  ? `${
                      Object.keys(prop.properties || {}).length
                    } properties defined`
                  : "No properties defined yet"}
              </div>
            </div>

            <div className="col-span-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleNavigate}
              >
                Edit Object Properties
              </Button>
            </div>
          </>
        )}

        {/* Array type fields */}
        {prop.type === "array" && (
          <>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Array Items</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="space-y-1">
                  <Label htmlFor={`${propKey}-minItems`} className="text-xs">
                    Min Items
                  </Label>
                  <Input
                    id={`${propKey}-minItems`}
                    type="number"
                    min="0"
                    value={prop.minItems || ""}
                    onChange={(e) =>
                      onUpdateProperty(
                        propKey,
                        "minItems",
                        e.target.value
                          ? Number.parseInt(e.target.value)
                          : undefined
                      )
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${propKey}-maxItems`} className="text-xs">
                    Max Items
                  </Label>
                  <Input
                    id={`${propKey}-maxItems`}
                    type="number"
                    min="0"
                    value={prop.maxItems || ""}
                    onChange={(e) =>
                      onUpdateProperty(
                        propKey,
                        "maxItems",
                        e.target.value
                          ? Number.parseInt(e.target.value)
                          : undefined
                      )
                    }
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${propKey}-uniqueItems`}
                      checked={prop.uniqueItems || false}
                      onCheckedChange={(checked) =>
                        onUpdateProperty(
                          propKey,
                          "uniqueItems",
                          checked === true ? true : undefined
                        )
                      }
                    />
                    <Label
                      htmlFor={`${propKey}-uniqueItems`}
                      className="text-xs"
                    >
                      Unique Items
                    </Label>
                  </div>
                </div>

                <div className="space-y-1 col-span-2">
                  <Label htmlFor={`${propKey}-items-type`} className="text-xs">
                    Items Type
                  </Label>
                  <Select
                    value={prop.items?.type || "string"}
                    onValueChange={(value) => {
                      const items = prop.items || {};
                      onUpdateProperty(propKey, "items", {
                        ...items,
                        type: value,
                      });
                    }}
                  >
                    <SelectTrigger
                      id={`${propKey}-items-type`}
                      className="h-8 text-sm"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">String</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="integer">Integer</SelectItem>
                      <SelectItem value="boolean">Boolean</SelectItem>
                      <SelectItem value="object">Object</SelectItem>
                      <SelectItem value="array">Array</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {prop.items?.type === "object" && (
                  <div className="col-span-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleNavigate}
                    >
                      Edit Array Items Schema
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface SchemaPropertiesProps {
  sortedProperties: [string, any][];
  schema: {
    properties: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
  onRemoveProperty: (key: string) => void;
  onUpdateProperty: (key: string, field: string, value: any) => void;
  onRenameProperty: (oldKey: string, newKey: string) => void;
  onToggleRequired: (key: string) => void;
  onAddProperty: () => void;
  onNavigateToPath: (path: string, label: string) => void;
  currentPath: string;
}

// Renders the list of properties for the current schema
function SchemaProperties({
  sortedProperties,
  schema,
  onRemoveProperty,
  onUpdateProperty,
  onRenameProperty,
  onToggleRequired,
  onAddProperty,
  onNavigateToPath,
  currentPath,
}: SchemaPropertiesProps) {
  return (
    <div className="space-y-3">
      {sortedProperties.map(([key, prop], index) => (
        <PropertyItem
          key={`${currentPath}-${key}-${index}`}
          index={index}
          propKey={key}
          prop={prop}
          schema={schema}
          onRemoveProperty={onRemoveProperty}
          onUpdateProperty={onUpdateProperty}
          onRenameProperty={onRenameProperty}
          onToggleRequired={onToggleRequired}
          onNavigateToPath={onNavigateToPath}
          currentPath={currentPath}
        />
      ))}

      <Button
        onClick={onAddProperty}
        size="sm"
        variant="outline"
        className="w-full"
      >
        <PlusCircle className="mr-2 h-3 w-3" />
        Add Property
      </Button>
    </div>
  );
}

// Main schema detail page component
export default function SchemaDetailPage() {
  const { uuid } = useParams();
  if (typeof uuid !== "string") throw new Error("Invalid UUID");

  const router = useRouter();

  const [schemaDetail, setSchemaDetail] = useState<SchemaDetail | null>(null);
  const [schema, setSchema] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState("");
  const [currentPath, setCurrentPath] = useState<string>("");
  const [pathHistory, setPathHistory] = useState<
    Array<{ path: string; label: string }>
  >([{ path: "", label: "Root" }]);
  const [lastSavedSchema, setLastSavedSchema] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"visual" | "json">("visual");

  // Fetch schema detail from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSchemaDetail(uuid);
      setSchemaDetail(data);
      setSchema(data.json);
      setLastSavedSchema(JSON.parse(JSON.stringify(data.json)));
      setNewSchemaName(data.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch schema");
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to fetch schema",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check for unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!lastSavedSchema || !schema) return false;
    return JSON.stringify(schema) !== JSON.stringify(lastSavedSchema);
  }, [schema, lastSavedSchema]);

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Add a new property to the current schema
  const addProperty = useCallback(() => {
    setSchema((prevSchema: any) => {
      const newSchema = JSON.parse(JSON.stringify(prevSchema));

      if (!currentPath) {
        if (!newSchema.properties) {
          newSchema.properties = {};
        }

        const newPropName = `newProperty${
          Object.keys(newSchema.properties || {}).length + 1
        }`;
        newSchema.properties[newPropName] = {
          type: "string",
        };
        return newSchema;
      } else {
        const parts = currentPath.split(".");
        let current = newSchema;

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (current.properties && part in current.properties) {
            if (i === parts.length - 1) {
              if (!current.properties[part].properties) {
                current.properties[part].properties = {};
              }

              const newPropName = `newProperty${
                Object.keys(current.properties[part].properties || {}).length +
                1
              }`;
              current.properties[part].properties[newPropName] = {
                type: "string",
              };
            } else {
              current = current.properties[part];
            }
          } else if (current.items && !isNaN(Number(part))) {
            if (!current.items.properties) {
              current.items.properties = {};
            }

            const newPropName = `newProperty${
              Object.keys(current.items.properties || {}).length + 1
            }`;
            current.items.properties[newPropName] = {
              type: "string",
            };
          }
        }
      }

      return newSchema;
    });
  }, [currentPath]);

  // Remove a property from the current schema
  const removeProperty = useCallback(
    (key: string) => {
      setSchema((prevSchema: any) => {
        const newSchema = JSON.parse(JSON.stringify(prevSchema));

        if (!currentPath) {
          if (newSchema.properties && key in newSchema.properties) {
            delete newSchema.properties[key];
          }
          if (newSchema.required) {
            newSchema.required = newSchema.required.filter(
              (item: string) => item !== key
            );
          }
        } else {
          const parts = currentPath.split(".");
          let current = newSchema;

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (current.properties && part in current.properties) {
              if (i === parts.length - 1) {
                if (
                  current.properties[part].properties &&
                  key in current.properties[part].properties
                ) {
                  delete current.properties[part].properties[key];
                }
                if (current.properties[part].required) {
                  current.properties[part].required = current.properties[
                    part
                  ].required.filter((item: string) => item !== key);
                }
              } else {
                current = current.properties[part];
              }
            } else if (current.items && !isNaN(Number(part))) {
              if (current.items.properties && key in current.items.properties) {
                delete current.items.properties[key];
              }
              if (current.items.required) {
                current.items.required = current.items.required.filter(
                  (item: string) => item !== key
                );
              }
            }
          }
        }

        return newSchema;
      });
    },
    [currentPath]
  );

  // Update a property field in the current schema
  const updateProperty = useCallback(
    (key: string, field: string, value: any) => {
      setSchema((prevSchema: any) => {
        const newSchema = JSON.parse(JSON.stringify(prevSchema));

        if (field === "title" && value === "") {
          value = undefined;
        }

        // Remove unrelated fields when type changes
        const cleanupPropertiesForType = (
          propObj: any,
          newType: PropertyType
        ) => {
          const allowedProps = TYPE_ALLOWED_PROPERTIES[newType];
          Object.keys(propObj).forEach((propKey) => {
            if (!allowedProps.includes(propKey) && propKey !== "type") {
              delete propObj[propKey];
            }
          });
          if (newType === "object" && !propObj.properties) {
            propObj.properties = {};
          }
          if (newType === "array" && !propObj.items) {
            propObj.items = { type: "string" };
          }
          return propObj;
        };

        if (!currentPath) {
          if (newSchema.properties && key in newSchema.properties) {
            if (value === undefined) {
              delete newSchema.properties[key][field];
            } else {
              if (field === "type") {
                newSchema.properties[key] = cleanupPropertiesForType(
                  newSchema.properties[key],
                  value
                );
              }
              newSchema.properties[key][field] = value;
            }
          }
        } else {
          const parts = currentPath.split(".");
          let current = newSchema;

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (current.properties && part in current.properties) {
              if (i === parts.length - 1) {
                if (
                  current.properties[part].properties &&
                  key in current.properties[part].properties
                ) {
                  if (value === undefined) {
                    delete current.properties[part].properties[key][field];
                  } else {
                    if (field === "type") {
                      current.properties[part].properties[key] =
                        cleanupPropertiesForType(
                          current.properties[part].properties[key],
                          value
                        );
                    }
                    current.properties[part].properties[key][field] = value;
                  }
                }
              } else {
                current = current.properties[part];
              }
            } else if (current.items && !isNaN(Number(part))) {
              if (current.items.properties && key in current.items.properties) {
                if (value === undefined) {
                  delete current.items.properties[key][field];
                } else {
                  if (field === "type") {
                    current.items.properties[key] = cleanupPropertiesForType(
                      current.items.properties[key],
                      value
                    );
                  }
                  current.items.properties[key][field] = value;
                }
              }
            }
          }
        }

        return newSchema;
      });
    },
    [currentPath]
  );

  // Rename a property key in the current schema
  const renameProperty = useCallback(
    (oldKey: string, newKey: string) => {
      if (oldKey === newKey || !newKey.trim()) return;

      setSchema((prevSchema: any) => {
        const newSchema = JSON.parse(JSON.stringify(prevSchema));

        if (!currentPath) {
          if (newSchema.properties && oldKey in newSchema.properties) {
            const newProperties: Record<string, any> = {};
            Object.entries(newSchema.properties).forEach(([key, value]) => {
              if (key === oldKey) {
                newProperties[newKey] = value;
              } else {
                newProperties[key] = value;
              }
            });
            newSchema.properties = newProperties;

            if (newSchema.required) {
              newSchema.required = newSchema.required.map((key: string) =>
                key === oldKey ? newKey : key
              );
            }
          }
        } else {
          const parts = currentPath.split(".");
          let current = newSchema;

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (current.properties && part in current.properties) {
              if (i === parts.length - 1) {
                if (
                  current.properties[part].properties &&
                  oldKey in current.properties[part].properties
                ) {
                  const newProperties: Record<string, any> = {};
                  Object.entries(current.properties[part].properties).forEach(
                    ([key, value]) => {
                      if (key === oldKey) {
                        newProperties[newKey] = value;
                      } else {
                        newProperties[key] = value;
                      }
                    }
                  );
                  current.properties[part].properties = newProperties;

                  if (current.properties[part].required) {
                    current.properties[part].required = current.properties[
                      part
                    ].required.map((key: string) =>
                      key === oldKey ? newKey : key
                    );
                  }
                }
              } else {
                current = current.properties[part];
              }
            } else if (current.items && !isNaN(Number(part))) {
              if (
                current.items.properties &&
                oldKey in current.items.properties
              ) {
                const newProperties: Record<string, any> = {};
                Object.entries(current.items.properties).forEach(
                  ([key, value]) => {
                    if (key === oldKey) {
                      newProperties[newKey] = value;
                    } else {
                      newProperties[key] = value;
                    }
                  }
                );
                current.items.properties = newProperties;

                if (current.items.required) {
                  current.items.required = current.items.required.map(
                    (key: string) => (key === oldKey ? newKey : key)
                  );
                }
              }
            }
          }
        }

        return newSchema;
      });
    },
    [currentPath]
  );

  // Toggle required status for a property
  const toggleRequired = useCallback(
    (key: string) => {
      setSchema((prevSchema: any) => {
        const newSchema = JSON.parse(JSON.stringify(prevSchema));

        if (!currentPath) {
          if (!newSchema.required) {
            newSchema.required = [];
          }

          const index = newSchema.required.indexOf(key);
          if (index >= 0) {
            newSchema.required.splice(index, 1);
          } else {
            newSchema.required.push(key);
          }
        } else {
          const parts = currentPath.split(".");
          let current = newSchema;

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (current.properties && part in current.properties) {
              if (i === parts.length - 1) {
                if (!current.properties[part].required) {
                  current.properties[part].required = [];
                }

                const index = current.properties[part].required.indexOf(key);
                if (index >= 0) {
                  current.properties[part].required.splice(index, 1);
                } else {
                  current.properties[part].required.push(key);
                }
              } else {
                current = current.properties[part];
              }
            } else if (current.items && !isNaN(Number(part))) {
              if (!current.items.required) {
                current.items.required = [];
              }

              const index = current.items.required.indexOf(key);
              if (index >= 0) {
                current.items.required.splice(index, 1);
              } else {
                current.items.required.push(key);
              }
            }
          }
        }

        return newSchema;
      });
    },
    [currentPath]
  );

  // Copy schema JSON to clipboard
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
    toast({
      title: "Copied to clipboard",
      description: "JSON Schema has been copied to clipboard",
    });
  }, [schema]);

  // Download schema as JSON file
  const downloadSchema = useCallback(() => {
    const blob = new Blob([JSON.stringify(schema, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${schemaDetail?.name || "schema"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [schema, schemaDetail]);

  // Save schema to server
  const saveSchema = useCallback(async () => {
    if (!schemaDetail) return;

    setSaving(true);
    try {
      await updateSchema(uuid, {
        json: schema,
        metadata: schemaDetail.metadata,
      });
      toast({
        title: "Success",
        description: "Schema saved successfully",
      });
      setSchemaDetail((prev) => (prev ? { ...prev, json: schema } : prev));
      setLastSavedSchema(JSON.parse(JSON.stringify(schema)));
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to save schema",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [uuid, schema, schemaDetail]);

  // Delete schema from server
  const handleDeleteSchema = useCallback(async () => {
    try {
      await deleteSchema(uuid);
      toast({
        title: "Success",
        description: "Schema deleted successfully",
      });
      router.push("/");
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete schema",
        variant: "destructive",
      });
    }
  }, [uuid, router]);

  // Rename schema
  const handleRenameSchema = useCallback(async () => {
    try {
      const { json, name } = await renameSchema(uuid, newSchemaName);
      toast({
        title: "Success",
        description: "Schema renamed successfully",
      });
      setSchemaDetail((prev) => (prev ? { ...prev, name, json } : prev));
      setSchema(json);
      setLastSavedSchema(JSON.parse(JSON.stringify(json)));
      setRenameDialogOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to rename schema",
        variant: "destructive",
      });
    }
  }, [uuid, newSchemaName]);

  // Navigate back to list
  const handleBackNavigation = useCallback(() => {
    router.push("/");
  }, [router]);

  // Update schema description
  const updateSchemaDescription = useCallback(
    (description: string) => {
      setSchema((prevSchema: any) => {
        const newSchema = JSON.parse(JSON.stringify(prevSchema));

        if (!currentPath) {
          newSchema.description = description || undefined;
        } else {
          const parts = currentPath.split(".");
          let current = newSchema;

          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (current.properties && part in current.properties) {
              current = current.properties[part];
            } else if (current.items && !isNaN(Number(part))) {
              current = current.items;
            }
          }

          const lastPart = parts[parts.length - 1];
          if (current.properties && lastPart in current.properties) {
            current.properties[lastPart].description = description || undefined;
          } else if (current.items && !isNaN(Number(lastPart))) {
            current.items.description = description || undefined;
          }
        }

        return newSchema;
      });
    },
    [currentPath]
  );

  // Navigate to a nested schema path
  const navigateToPath = useCallback(
    (path: string, label: string) => {
      const existingIndex = pathHistory.findIndex((item) => item.path === path);
      if (existingIndex >= 0) {
        setPathHistory(pathHistory.slice(0, existingIndex + 1));
      } else {
        setPathHistory([...pathHistory, { path, label }]);
      }
      setCurrentPath(path);
    },
    [pathHistory]
  );

  // Get the current schema object by path
  const getCurrentSchema = useCallback(() => {
    if (!schema) return null;
    if (!currentPath) return schema;

    const parts = currentPath.split(".");
    let current: any = schema;

    for (const part of parts) {
      if (current.properties && part in current.properties) {
        current = current.properties[part];
      } else if (current.items && !isNaN(Number(part))) {
        current = current.items;
      } else {
        return null;
      }
    }

    return current;
  }, [schema, currentPath]);

  const currentSchema = getCurrentSchema();

  // Get sorted properties for the current schema
  const sortedProperties = useMemo(() => {
    if (!currentSchema?.properties) return [] as [string, any][];
    return Object.entries(currentSchema.properties) as [string, any][];
  }, [currentSchema?.properties]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 max-w-4xl mx-auto">
        <div className="text-center py-8 text-red-500">
          <p>{error}</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/">Back to List</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!schemaDetail || !schema) {
    return (
      <div className="p-3 max-w-4xl mx-auto">
        <div className="text-center py-8 text-muted-foreground">
          <p>Schema not found</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/">Back to List</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          {hasUnsavedChanges ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                  <AlertDialogDescription>
                    You have unsaved changes. Are you sure you want to leave
                    without saving? Your changes will be lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBackNavigation}>
                    Discard Changes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" prefetch={false}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <h1 className="text-xl font-bold">{schemaDetail.name}</h1>
        </div>
        <div className="flex gap-1">
          <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Pencil className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename Schema</DialogTitle>
                <DialogDescription>
                  Enter a new name for this schema.
                </DialogDescription>
              </DialogHeader>
              <Input
                placeholder="New Schema Name"
                value={newSchemaName}
                onChange={(e) => setNewSchemaName(e.target.value)}
              />
              <DialogFooter>
                <Button
                  onClick={handleRenameSchema}
                  disabled={!newSchemaName.trim()}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm" onClick={copyToClipboard}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadSchema}>
            <Download className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Schema</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this schema? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSchema}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            size="sm"
            onClick={saveSchema}
            disabled={saving || !hasUnsavedChanges}
          >
            {saving ? (
              <LoadingSpinner className="h-4 w-4 mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center">
          <div className="overflow-x-auto flex-1">
            <Tabs
              value={currentPath}
              onValueChange={(value) => navigateToPath(value, "")}
            >
              <TabsList className="w-full justify-start">
                {pathHistory.map((item) => (
                  <TabsTrigger
                    key={item.path}
                    value={item.path}
                    className="max-w-[200px] text-left overflow-hidden whitespace-nowrap overflow-ellipsis"
                  >
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="ml-2">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) =>
                value && setViewMode(value as "visual" | "json")
              }
            >
              <ToggleGroupItem value="visual" aria-label="Visual Editor">
                <Eye className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="json" aria-label="JSON View">
                <Code className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {viewMode === "visual" && (
          <Card className="mb-3">
            <CardContent className="p-3">
              <div className="space-y-1 mb-3">
                <Label htmlFor="schema-description" className="text-xs">
                  Schema Description
                </Label>
                <Input
                  id="schema-description"
                  value={currentSchema?.description || ""}
                  onChange={(e) => updateSchemaDescription(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <SchemaProperties
                currentPath={currentPath}
                sortedProperties={sortedProperties}
                schema={currentSchema}
                onRemoveProperty={removeProperty}
                onUpdateProperty={updateProperty}
                onRenameProperty={renameProperty}
                onToggleRequired={toggleRequired}
                onAddProperty={addProperty}
                onNavigateToPath={navigateToPath}
              />
            </CardContent>
          </Card>
        )}

        {viewMode === "json" && (
          <Card>
            <CardContent className="p-3">
              <pre className="text-xs overflow-auto bg-muted p-2 rounded-md">
                {JSON.stringify(currentSchema, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
