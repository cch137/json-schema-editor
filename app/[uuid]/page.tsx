"use client";

import React from "react";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import {
  fetchSchemaDetail,
  updateSchema,
  deleteSchema as apiDeleteSchema,
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type PropertyType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array"
  | "null";

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
  null: ["title", "description"],
};

// String formats for string type
const STRING_FORMATS = [
  { value: "none", label: "None" },
  { value: "uuid", label: "UUID" },
  { value: "email", label: "Email" },
  { value: "uri", label: "URI" },
  { value: "date-time", label: "Date-Time" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "ipv4", label: "IPv4" },
  { value: "ipv6", label: "IPv6" },
];

// Utility function to generate a unique ID for a property path
function getPropertyId(propPath: string[]): string {
  return `property-${propPath.join("-")}`;
}

// Interface for schema node (can be a property or an items definition)
interface SchemaNode {
  type: PropertyType;
  title?: string;
  description?: string;
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
  required?: string[];
  [key: string]: any;
}

// Interface for property editor props
interface PropertyEditorProps {
  // The property key (or null for anonymous nodes like array items)
  propKey: string | null;
  // The schema node to edit
  node: SchemaNode;
  // The parent schema (for required properties)
  parentSchema?: {
    properties?: Record<string, any>;
    required?: string[];
    [key: string]: any;
  };
  // Path to this node in the schema
  path: string[];
  // Callback when a property is removed
  onRemove?: () => void;
  // Callback when a property is updated
  onUpdate: (updates: Partial<SchemaNode>) => void;
  // Callback when a property is renamed (only for named properties)
  onRename?: (newKey: string) => void;
  // Callback when required status is toggled (only for named properties)
  onToggleRequired?: () => void;
  // Level of nesting (for UI indentation)
  level?: number;
}

// 首先，添加一些类型图标常量
const TYPE_ICONS: Record<PropertyType, React.ReactNode> = {
  string: <span className="text-blue-500 text-xs font-mono">abc</span>,
  number: <span className="text-green-500 text-xs font-mono">123</span>,
  integer: <span className="text-emerald-500 text-xs font-mono">int</span>,
  boolean: <span className="text-purple-500 text-xs font-mono">T/F</span>,
  object: <span className="text-orange-500 text-xs font-mono">{"{}"}</span>,
  array: <span className="text-pink-500 text-xs font-mono">[ ]</span>,
  null: <span className="text-gray-500 text-xs font-mono">null</span>,
};

// 更新 PropertyEditor 组件
const PropertyEditor: React.FC<PropertyEditorProps> = ({
  propKey,
  node,
  parentSchema,
  path,
  onRemove,
  onUpdate,
  onRename,
  onToggleRequired,
  level = 0,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tempKey, setTempKey] = useState(propKey || "");
  const [isEditing, setIsEditing] = useState(false);
  const propertyId = getPropertyId(path);
  const isRequired = Boolean(
    propKey !== null && parentSchema?.required?.includes(propKey)
  );

  // Use session storage to persist expanded state
  const [isExpanded, setIsExpanded] = useState(() => {
    // Try to load state from session storage on initial render
    if (typeof window !== "undefined") {
      const savedState = sessionStorage.getItem(propertyId);
      return savedState === "expanded";
    }
    return false;
  });

  // Update session storage when expanded state changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isExpanded) {
        sessionStorage.setItem(propertyId, "expanded");
      } else {
        sessionStorage.setItem(propertyId, "collapsed");
      }
    }
  }, [isExpanded, propertyId]);

  // Sync tempKey with propKey when not editing
  useEffect(() => {
    if (!isEditing && propKey !== null) {
      setTempKey(propKey);
    }
  }, [propKey, isEditing]);

  // Handle property key change (rename)
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setTempKey(newKey);
    setIsEditing(true);
  };

  // Commit rename on Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (tempKey.trim() !== "" && tempKey !== propKey && onRename) {
        onRename(tempKey);
      }
      setIsEditing(false);
      inputRef.current?.blur();
    }
  };

  // Commit or revert rename on blur
  const handleBlur = () => {
    if (isEditing && tempKey.trim() !== "" && tempKey !== propKey && onRename) {
      onRename(tempKey);
    } else if (tempKey.trim() === "" && propKey !== null) {
      setTempKey(propKey);
    }
    setIsEditing(false);
  };

  // Toggle expansion of nested properties
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Check if this node has nested properties that can be expanded
  const hasNestedContent = node.type === "object" || node.type === "array";

  // Add a new property to an object
  const handleAddProperty = () => {
    if (node.type === "object") {
      const properties = node.properties || {};
      let i = 0;
      let newPropName = `property${++i}`;
      while (newPropName in properties) {
        newPropName = `property${++i}`;
      }
      onUpdate({
        properties: {
          ...properties,
          [newPropName]: { type: "string" },
        },
      });
      setIsExpanded(true);
    }
  };

  // Update array items type
  const handleUpdateArrayItemsType = (type: PropertyType) => {
    // Create appropriate default items based on type
    let items: SchemaNode;

    if (type === "object") {
      items = { type, properties: {} };
    } else if (type === "array") {
      items = { type, items: { type: "string" } };
    } else {
      items = { type };
    }

    onUpdate({ items });
  };

  // 修改 Required Checkbox 部分
  const handleRequiredChange = useCallback(() => {
    if (onToggleRequired) {
      onToggleRequired();
    }
  }, [onToggleRequired]);

  // Render the property editor UI with improved visuals
  return (
    <div
      className={cn(
        "border rounded-md relative mb-2 transition-all duration-200 group pl-2",
        level > 0 && "ml-3",
        isRequired
          ? "border-blue-300 dark:border-blue-800"
          : "border-neutral-200 dark:border-neutral-800",
        hasNestedContent && isExpanded
          ? "bg-neutral-50 dark:bg-neutral-900"
          : "bg-white dark:bg-neutral-950",
        "hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700"
      )}
    >
      {/* Header section */}
      <div className="flex items-center p-2 gap-1 border-b border-neutral-100 dark:border-neutral-900">
        {/* Expand/collapse button for nested content */}
        {hasNestedContent && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -ml-1"
            onClick={toggleExpand}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}

        {/* Type indicator */}
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
          {TYPE_ICONS[node.type]}
        </div>

        {/* Property name or title */}
        <div className="flex-grow min-w-0">
          {propKey !== null && onRename ? (
            <Input
              id={`${propertyId}-name`}
              value={tempKey}
              onChange={handleKeyChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="h-6 text-xs px-2 py-0 border-dashed focus:border-solid"
              ref={inputRef}
            />
          ) : (
            <div className="text-xs font-medium truncate">
              {node.title || (propKey === null ? "Array Items" : propKey)}
            </div>
          )}
        </div>

        {/* Required checkbox - 移到类型选择前面 */}
        {propKey !== null && parentSchema && onToggleRequired && (
          <div className="flex items-center gap-1">
            <Checkbox
              id={`${propertyId}-required`}
              checked={isRequired}
              onCheckedChange={handleRequiredChange}
              className="h-4 w-4"
            />
            <Label
              htmlFor={`${propertyId}-required`}
              className="text-xs opacity-75 cursor-pointer"
            >
              Required
            </Label>
          </div>
        )}

        {/* Type selector */}
        <Select
          value={node.type}
          onValueChange={(value) => {
            // 4. 在改变类型时删除不属于新类型的属性
            const newType = value as PropertyType;
            const allowedProps = TYPE_ALLOWED_PROPERTIES[newType];
            const updates: Partial<SchemaNode> = { type: newType };

            // 创建一个新对象，只保留允许的属性
            const currentNode = { ...node };
            Object.keys(currentNode).forEach((key) => {
              // 保留 type, title, description 这些基本属性
              if (
                key !== "type" &&
                key !== "title" &&
                key !== "description" &&
                !allowedProps.includes(key)
              ) {
                updates[key] = undefined; // 设置为 undefined 以删除该属性
              }
            });

            // 对于 object 类型，确保有 properties
            if (newType === "object" && !currentNode.properties) {
              updates.properties = {};
              updates.additionalProperties = false;
            }

            // 对于 array 类型，删除 items 以便用户重新选择
            if (newType === "array") {
              updates.items = undefined;
            }

            onUpdate(updates);
          }}
        >
          <SelectTrigger className="h-6 text-xs px-2 w-20 ml-1 bg-neutral-50 dark:bg-neutral-900">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="string" className="text-xs h-7 py-0">
              String
            </SelectItem>
            <SelectItem value="number" className="text-xs h-7 py-0">
              Number
            </SelectItem>
            <SelectItem value="integer" className="text-xs h-7 py-0">
              Integer
            </SelectItem>
            <SelectItem value="boolean" className="text-xs h-7 py-0">
              Boolean
            </SelectItem>
            <SelectItem value="object" className="text-xs h-7 py-0">
              Object
            </SelectItem>
            <SelectItem value="array" className="text-xs h-7 py-0">
              Array
            </SelectItem>
            <SelectItem value="null" className="text-xs h-7 py-0">
              Null
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Action buttons */}
        <div className="flex-shrink-0 flex gap-1">
          {/* Remove button */}
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onRemove}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content section */}
      <div className="p-2">
        {/* Description field */}
        <div className="mb-2">
          <Input
            id={`${propertyId}-description`}
            value={node.description || ""}
            onChange={(e) =>
              onUpdate({ description: e.target.value || undefined })
            }
            className="h-6 text-xs px-2 py-0"
            placeholder="Description"
          />
        </div>

        {/* Type-specific fields */}
        <div className="mb-2">
          {renderTypeSpecificFields(node, propertyId, onUpdate)}
        </div>

        {/* Nested content for object and array types */}
        {hasNestedContent && isExpanded && (
          <div className="mt-2 pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800">
            {node.type === "object" && (
              <>
                {node.properties && Object.keys(node.properties).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(node.properties).map(
                      ([childKey, childNode]) => (
                        <PropertyEditor
                          key={`${propertyId}-${childKey}`}
                          propKey={childKey}
                          node={childNode as SchemaNode}
                          parentSchema={node}
                          path={[...path, "properties", childKey]}
                          onRemove={() => {
                            const newProperties = { ...node.properties };
                            delete newProperties[childKey];
                            onUpdate({
                              properties:
                                Object.keys(newProperties).length > 0
                                  ? newProperties
                                  : undefined,
                            });
                          }}
                          onUpdate={(updates) => {
                            const newProperties = { ...node.properties };
                            newProperties[childKey] = {
                              ...newProperties[childKey],
                              ...updates,
                            };
                            onUpdate({ properties: newProperties });
                          }}
                          onRename={(newKey) => {
                            const newProperties = { ...node.properties };
                            newProperties[newKey] = newProperties[childKey];
                            delete newProperties[childKey];
                            onUpdate({ properties: newProperties });
                          }}
                          onToggleRequired={() => {
                            const required = node.required || [];
                            const newRequired = required.includes(childKey)
                              ? required.filter((k) => k !== childKey)
                              : [...required, childKey];
                            onUpdate({
                              required:
                                newRequired.length > 0
                                  ? newRequired
                                  : undefined,
                            });
                          }}
                          level={level + 1}
                        />
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground py-1 italic">
                    No properties defined yet
                  </div>
                )}
                <Button
                  onClick={handleAddProperty}
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 h-7 text-xs"
                >
                  <PlusCircle className="mr-1 h-3 w-3" />
                  Add Property
                </Button>
              </>
            )}

            {node.type === "array" && (
              <div className="border border-dashed border-neutral-200 dark:border-neutral-800 rounded p-2">
                {!node.items ? (
                  <div className="flex flex-col gap-2">
                    <div className="text-xs text-muted-foreground py-1 italic">
                      Select a type for array items
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          "string",
                          "number",
                          "boolean",
                          "object",
                          "array",
                        ] as PropertyType[]
                      ).map((type) => (
                        <Button
                          key={type}
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs"
                          onClick={() => handleUpdateArrayItemsType(type)}
                        >
                          {TYPE_ICONS[type]}
                          <span className="ml-1">{type}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-medium mb-1 flex items-center">
                      <span className="mr-1">Items Definition</span>
                      <span className="text-pink-500 text-xs font-mono">
                        [...]
                      </span>
                    </div>
                    <PropertyEditor
                      propKey={null}
                      node={node.items}
                      path={[...path, "items"]}
                      onUpdate={(updates) => {
                        onUpdate({ items: { ...node.items!, ...updates } });
                      }}
                      level={level + 1}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 更新 renderTypeSpecificFields 函数，使其更加紧凑
function renderTypeSpecificFields(
  node: SchemaNode,
  propertyId: string,
  onUpdate: (updates: Partial<SchemaNode>) => void
) {
  const renderField = (
    label: string,
    id: string,
    component: React.ReactNode
  ) => (
    <div className="mb-1">
      <div className="flex items-center">
        <Label htmlFor={id} className="text-xs opacity-75 w-24 flex-shrink-0">
          {label}
        </Label>
        {component}
      </div>
    </div>
  );

  switch (node.type) {
    case "string":
      return (
        <div className="space-y-1">
          {renderField(
            "Default",
            `${propertyId}-default`,
            <Input
              id={`${propertyId}-default`}
              value={node.default || ""}
              onChange={(e) =>
                onUpdate({ default: e.target.value || undefined })
              }
              className="h-6 text-xs px-2 py-0"
            />
          )}

          {renderField(
            "Format",
            `${propertyId}-format`,
            <Select
              value={node.format || "none"}
              onValueChange={(value) =>
                onUpdate({ format: value === "none" ? undefined : value })
              }
            >
              <SelectTrigger
                id={`${propertyId}-format`}
                className="h-6 text-xs px-2"
              >
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {STRING_FORMATS.map((format) => (
                  <SelectItem
                    key={format.value}
                    value={format.value}
                    className="text-xs h-7 py-0"
                  >
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="grid grid-cols-2 gap-2">
            {renderField(
              "Min Length",
              `${propertyId}-minLength`,
              <Input
                id={`${propertyId}-minLength`}
                type="number"
                min="0"
                value={node.minLength || ""}
                onChange={(e) =>
                  onUpdate({
                    minLength: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                className="h-6 text-xs px-2 py-0"
              />
            )}

            {renderField(
              "Max Length",
              `${propertyId}-maxLength`,
              <Input
                id={`${propertyId}-maxLength`}
                type="number"
                min="0"
                value={node.maxLength || ""}
                onChange={(e) =>
                  onUpdate({
                    maxLength: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                className="h-6 text-xs px-2 py-0"
              />
            )}
          </div>

          {renderField(
            "Pattern",
            `${propertyId}-pattern`,
            <Input
              id={`${propertyId}-pattern`}
              value={node.pattern || ""}
              onChange={(e) =>
                onUpdate({ pattern: e.target.value || undefined })
              }
              className="h-6 text-xs px-2 py-0"
              placeholder="Regular expression"
            />
          )}

          {renderField(
            "Enum Values",
            `${propertyId}-enum`,
            <Input
              id={`${propertyId}-enum`}
              value={node.enum ? node.enum.join(", ") : ""}
              onChange={(e) => {
                const enumValues = e.target.value
                  ? e.target.value.split(",").map((v) => v.trim())
                  : undefined;
                onUpdate({
                  enum:
                    enumValues && enumValues.length > 0
                      ? enumValues
                      : undefined,
                });
              }}
              className="h-6 text-xs px-2 py-0"
              placeholder="Comma separated values"
            />
          )}
        </div>
      );
    case "number":
    case "integer":
      return (
        <div className="space-y-1">
          {renderField(
            "Default",
            `${propertyId}-default`,
            <Input
              id={`${propertyId}-default`}
              type="number"
              value={node.default !== undefined ? node.default : ""}
              onChange={(e) => {
                const value = e.target.value
                  ? node.type === "integer"
                    ? Number.parseInt(e.target.value, 10)
                    : Number.parseFloat(e.target.value)
                  : undefined;
                onUpdate({ default: value });
              }}
              className="h-6 text-xs px-2 py-0"
            />
          )}

          <div className="grid grid-cols-2 gap-2">
            {renderField(
              "Minimum",
              `${propertyId}-minimum`,
              <Input
                id={`${propertyId}-minimum`}
                type="number"
                value={node.minimum !== undefined ? node.minimum : ""}
                onChange={(e) => {
                  const value = e.target.value
                    ? node.type === "integer"
                      ? Number.parseInt(e.target.value, 10)
                      : Number.parseFloat(e.target.value)
                    : undefined;
                  onUpdate({ minimum: value });
                }}
                className="h-6 text-xs px-2 py-0"
              />
            )}

            {renderField(
              "Maximum",
              `${propertyId}-maximum`,
              <Input
                id={`${propertyId}-maximum`}
                type="number"
                value={node.maximum !== undefined ? node.maximum : ""}
                onChange={(e) => {
                  const value = e.target.value
                    ? node.type === "integer"
                      ? Number.parseInt(e.target.value, 10)
                      : Number.parseFloat(e.target.value)
                    : undefined;
                  onUpdate({ maximum: value });
                }}
                className="h-6 text-xs px-2 py-0"
              />
            )}
          </div>

          {renderField(
            "Multiple Of",
            `${propertyId}-multipleOf`,
            <Input
              id={`${propertyId}-multipleOf`}
              type="number"
              min="0"
              step={node.type === "integer" ? "1" : "0.1"}
              value={node.multipleOf !== undefined ? node.multipleOf : ""}
              onChange={(e) => {
                const value = e.target.value
                  ? node.type === "integer"
                    ? Number.parseInt(e.target.value, 10)
                    : Number.parseFloat(e.target.value)
                  : undefined;
                onUpdate({ multipleOf: value });
              }}
              className="h-6 text-xs px-2 py-0"
            />
          )}

          <div className="grid grid-cols-2 gap-2">
            {renderField(
              "Exclusive Min",
              `${propertyId}-exclusiveMinimum`,
              <div className="flex items-center h-6">
                <Checkbox
                  id={`${propertyId}-exclusiveMinimum`}
                  checked={node.exclusiveMinimum === true}
                  onCheckedChange={(checked) =>
                    onUpdate({
                      exclusiveMinimum: checked === true ? true : undefined,
                    })
                  }
                  className="h-4 w-4"
                />
              </div>
            )}

            {renderField(
              "Exclusive Max",
              `${propertyId}-exclusiveMaximum`,
              <div className="flex items-center h-6">
                <Checkbox
                  id={`${propertyId}-exclusiveMaximum`}
                  checked={node.exclusiveMaximum === true}
                  onCheckedChange={(checked) =>
                    onUpdate({
                      exclusiveMaximum: checked === true ? true : undefined,
                    })
                  }
                  className="h-4 w-4"
                />
              </div>
            )}
          </div>
        </div>
      );
    case "boolean":
      return (
        <div className="space-y-1">
          {renderField(
            "Default",
            `${propertyId}-default`,
            <Select
              value={
                node.default !== undefined ? String(node.default) : "false"
              }
              onValueChange={(value) => onUpdate({ default: value === "true" })}
            >
              <SelectTrigger
                id={`${propertyId}-default`}
                className="h-6 text-xs px-2"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true" className="text-xs h-7 py-0">
                  True
                </SelectItem>
                <SelectItem value="false" className="text-xs h-7 py-0">
                  False
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      );
    case "array":
      return (
        <div className="space-y-1">
          <div className="grid grid-cols-2 gap-2">
            {renderField(
              "Min Items",
              `${propertyId}-minItems`,
              <Input
                id={`${propertyId}-minItems`}
                type="number"
                min="0"
                value={node.minItems !== undefined ? node.minItems : ""}
                onChange={(e) =>
                  onUpdate({
                    minItems: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                className="h-6 text-xs px-2 py-0"
              />
            )}

            {renderField(
              "Max Items",
              `${propertyId}-maxItems`,
              <Input
                id={`${propertyId}-maxItems`}
                type="number"
                min="0"
                value={node.maxItems !== undefined ? node.maxItems : ""}
                onChange={(e) =>
                  onUpdate({
                    maxItems: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                className="h-6 text-xs px-2 py-0"
              />
            )}
          </div>

          {renderField(
            "Unique Items",
            `${propertyId}-uniqueItems`,
            <div className="flex items-center h-6">
              <Checkbox
                id={`${propertyId}-uniqueItems`}
                checked={node.uniqueItems === true}
                onCheckedChange={(checked) =>
                  onUpdate({ uniqueItems: checked === true ? true : undefined })
                }
                className="h-4 w-4"
              />
            </div>
          )}
        </div>
      );
    case "object":
      return (
        <div className="space-y-1">
          {renderField(
            "Additional Props",
            `${propertyId}-additionalProperties`,
            <div className="flex items-center h-6">
              <Checkbox
                id={`${propertyId}-additionalProperties`}
                checked={node.additionalProperties !== false}
                onCheckedChange={(checked) =>
                  onUpdate({
                    additionalProperties: checked === true ? undefined : false,
                  })
                }
                className="h-4 w-4"
              />
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}

// Update the SchemaEditor component to add additionalProperties checkbox for root schema
// Find the SchemaEditor component and add the following code after the schema description input:
const SchemaEditor = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    schema: any;
    onUpdate: (schema: any) => void;
  }
>(({ schema, onUpdate, ...props }, ref) => {
  // Ensure schema is an object
  const safeSchema = schema || {};

  // Add a new root property
  const handleAddProperty = useCallback(() => {
    const newSchema = JSON.parse(JSON.stringify(safeSchema)); // Deep copy to ensure state update
    if (!newSchema.properties) {
      newSchema.properties = {};
    }

    let i = 0;
    let newPropName = `property${++i}`;
    while (newPropName in newSchema.properties) {
      newPropName = `property${++i}`;
    }
    newSchema.properties[newPropName] = { type: "string" };
    onUpdate(newSchema); // Pass the new object to ensure state update
  }, [safeSchema, onUpdate]);

  // Remove a root property
  const handleRemoveProperty = useCallback(
    (key: string) => {
      const newSchema = JSON.parse(JSON.stringify(safeSchema)); // Deep copy
      if (newSchema.properties && key in newSchema.properties) {
        delete newSchema.properties[key];

        // Also remove from required if present
        if (newSchema.required) {
          newSchema.required = newSchema.required.filter(
            (k: string) => k !== key
          );
          if (newSchema.required.length === 0) {
            delete newSchema.required;
          }
        }
      }
      onUpdate(newSchema);
    },
    [safeSchema, onUpdate]
  );

  // Update a root property
  const handleUpdateProperty = useCallback(
    (key: string, updates: Partial<SchemaNode>) => {
      const newSchema = JSON.parse(JSON.stringify(safeSchema)); // Deep copy
      if (newSchema.properties && key in newSchema.properties) {
        newSchema.properties[key] = {
          ...newSchema.properties[key],
          ...updates,
        };
      }
      onUpdate(newSchema);
    },
    [safeSchema, onUpdate]
  );

  // Rename a root property
  const handleRenameProperty = useCallback(
    (oldKey: string, newKey: string) => {
      const newSchema = JSON.parse(JSON.stringify(safeSchema)); // Deep copy
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

        // Update required array if present
        if (newSchema.required) {
          newSchema.required = newSchema.required.map((key: string) =>
            key === oldKey ? newKey : key
          );
        }
      }
      onUpdate(newSchema);
    },
    [safeSchema, onUpdate]
  );

  // Toggle required status for a property
  const handleToggleRequired = useCallback(
    (key: string) => {
      const newSchema = JSON.parse(JSON.stringify(safeSchema)); // Deep copy to ensure state update
      if (!newSchema.required) {
        newSchema.required = [];
      }

      const index = newSchema.required.indexOf(key);
      if (index >= 0) {
        newSchema.required.splice(index, 1);
        newSchema.required = [...newSchema.required];
        if (newSchema.required.length === 0) {
          delete newSchema.required;
        }
      } else {
        newSchema.required = [...newSchema.required, key];
      }

      // Ensure state update
      onUpdate({ ...newSchema });
    },
    [safeSchema, onUpdate]
  );

  // Update schema description
  const handleUpdateDescription = useCallback(
    (description: string) => {
      const newSchema = { ...safeSchema };
      newSchema.description = description || undefined;
      onUpdate(newSchema);
    },
    [safeSchema, onUpdate]
  );

  return (
    <div className="space-y-2" {...props} ref={ref}>
      <div className="space-y-1 mb-2">
        <Label htmlFor="schema-description" className="text-xs opacity-75">
          Schema Description
        </Label>
        <Input
          id="schema-description"
          value={safeSchema?.description || ""}
          onChange={(e) => handleUpdateDescription(e.target.value)}
          className="h-7 text-xs"
          placeholder="Describe your schema"
        />
      </div>

      {/* Add additionalProperties checkbox for root schema */}
      <div className="flex items-center space-x-2 mb-2">
        <Checkbox
          id="schema-additional-properties"
          checked={safeSchema.additionalProperties !== false}
          onCheckedChange={(checked) =>
            onUpdate({
              ...safeSchema,
              additionalProperties: checked === true ? undefined : false,
            })
          }
        />
        <Label
          htmlFor="schema-additional-properties"
          className="text-xs opacity-75"
        >
          Allow Additional Properties
        </Label>
      </div>

      <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-md border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Schema Properties</h3>
          <div className="text-xs text-muted-foreground">
            {safeSchema.properties
              ? Object.keys(safeSchema.properties).length
              : 0}{" "}
            properties
          </div>
        </div>

        {safeSchema.properties &&
          Object.entries(safeSchema.properties).map(([key, prop]) => (
            <PropertyEditor
              key={`root-property-${key}`}
              propKey={key}
              node={prop as SchemaNode}
              parentSchema={safeSchema}
              path={["properties", key]}
              onRemove={() => handleRemoveProperty(key)}
              onUpdate={(updates) => handleUpdateProperty(key, updates)}
              onRename={(newKey) => handleRenameProperty(key, newKey)}
              onToggleRequired={() => handleToggleRequired(key)}
            />
          ))}

        <Button
          onClick={handleAddProperty}
          size="sm"
          variant="outline"
          className="w-full mt-2 h-7 text-xs"
        >
          <PlusCircle className="mr-1 h-3 w-3" />
          Add Property
        </Button>
      </div>
    </div>
  );
});
SchemaEditor.displayName = "SchemaEditor";

// Now update the SchemaDetailPage component to move the view toggle inside the Card
// and fix the rename/delete functionality
export default function SchemaDetailPage() {
  const [viewMode, setViewMode] = useState<"visual" | "json">("visual");
  const [schema, setSchema] = useState<any>({});
  const [schemaDetail, setSchemaDetail] = useState<SchemaDetail | null>(null);
  const [saving, setSaving] = useState(false);
  // For the rename functionality
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // For the delete functionality
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const params = useParams();
  const schemaId = params.uuid as string;
  const [lastSavedSchema, setLastSavedSchema] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (schemaId) {
        try {
          const detail = await fetchSchemaDetail(schemaId);
          setSchemaDetail(detail);
          setSchema(detail.json);
          setLastSavedSchema(JSON.parse(JSON.stringify(detail.json)));
          setNewSchemaName(detail.name);
        } catch (error) {
          console.error("Error fetching schema detail:", error);
          toast({
            title: "Error",
            description: "Failed to load schema details.",
            variant: "destructive",
          });
        }
      }
    };

    fetchData();
  }, [schemaId]);

  // Check for unsaved changes using JSON.stringify comparison
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

  // Rename schema handler
  const handleRenameSchema = async () => {
    if (!schemaId || !newSchemaName.trim()) return;

    setIsRenaming(true);
    try {
      // Create a copy of the current schema to update the title
      const updatedSchema = JSON.parse(JSON.stringify(schema));
      updatedSchema.title = newSchemaName.trim();

      // If the schema is not in an unsaved state, we can update it directly on the client
      if (!hasUnsavedChanges) {
        await renameSchema(schemaId, newSchemaName.trim());
        toast({
          title: "Success",
          description: "Schema renamed successfully",
        });

        // Update the schema detail and schema with the new name/title
        setSchemaDetail((prev) =>
          prev ? { ...prev, name: newSchemaName.trim() } : prev
        );
        setSchema(updatedSchema);
        // Also update lastSavedSchema to prevent marking as unsaved
        setLastSavedSchema(JSON.parse(JSON.stringify(updatedSchema)));
      } else {
        // If there are already unsaved changes, just update the schema title locally
        // The rename will be applied on the server when the user saves all changes
        await renameSchema(schemaId, newSchemaName.trim());
        toast({
          title: "Success",
          description:
            "Schema renamed successfully. Other changes still need to be saved.",
        });

        // Update the schema detail name but keep the unsaved changes
        setSchemaDetail((prev) =>
          prev ? { ...prev, name: newSchemaName.trim() } : prev
        );
        setSchema(updatedSchema);
      }

      setRenameDialogOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to rename schema",
        variant: "destructive",
      });
    } finally {
      setIsRenaming(false);
    }
  };

  // Delete schema handler
  const handleDeleteSchema = async () => {
    if (!schemaId) return;

    setIsDeleting(true);
    try {
      await apiDeleteSchema(schemaId);
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
    } finally {
      setIsDeleting(false);
    }
  };

  const saveSchema = async () => {
    if (!schemaId || !schemaDetail) return;

    setSaving(true);
    try {
      await updateSchema(schemaId, {
        json: schema,
        metadata: schemaDetail.metadata,
      });
      toast({
        title: "Success",
        description: "Schema saved successfully.",
      });
      const detail = await fetchSchemaDetail(schemaId);
      setSchemaDetail(detail);
      setSchema(detail.json);
      setLastSavedSchema(JSON.parse(JSON.stringify(detail.json)));
    } catch (error) {
      console.error("Error saving schema:", error);
      toast({
        title: "Error",
        description: "Failed to save schema.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const downloadSchema = () => {
    const jsonString = JSON.stringify(schema, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${schemaDetail?.name || "schema"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
      toast({
        title: "Copied!",
        description: "Schema copied to clipboard.",
      });
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast({
        title: "Error",
        description: "Failed to copy schema to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleBackNavigation = () => {
    router.push("/");
  };

  if (!schemaDetail) {
    return (
      <div className="flex items-center justify-center h-full py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container px-3 py-4 max-w-4xl mx-auto space-y-3">
      {/* Update the top navigation bar */}
      <div className="flex justify-between items-center bg-white dark:bg-neutral-950 p-2 rounded-md border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-2">
          {hasUnsavedChanges ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                  <AlertDialogDescription>
                    You have unsaved changes. Are you sure you want to leave
                    without saving?
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
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
              <Link href="/" prefetch={false}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <h1 className="text-base font-bold truncate max-w-[200px] sm:max-w-xs">
            {schemaDetail.name}
          </h1>
          {hasUnsavedChanges && (
            <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded-full">
              Unsaved
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              setNewSchemaName(schemaDetail?.name || "");
              setRenameDialogOpen(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename Schema</DialogTitle>
                <DialogDescription>
                  Enter a new name for this schema.
                </DialogDescription>
              </DialogHeader>
              <Input
                placeholder="Schema Name"
                value={newSchemaName}
                onChange={(e) => setNewSchemaName(e.target.value)}
              />
              <DialogFooter>
                <Button
                  onClick={handleRenameSchema}
                  disabled={isRenaming || !newSchemaName.trim()}
                >
                  {isRenaming ? (
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                  ) : null}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="h-7 w-7 p-0"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadSchema}
            className="h-7 w-7 p-0"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
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
                <AlertDialogAction
                  onClick={handleDeleteSchema}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                  ) : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            size="sm"
            onClick={saveSchema}
            disabled={saving || !hasUnsavedChanges}
            className="h-7 text-xs px-2"
          >
            {saving ? (
              <LoadingSpinner className="h-3 w-3 mr-1" />
            ) : (
              <Save className="h-3 w-3 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Move the view toggle inside the Card */}
      <Card className="mb-3 border-neutral-200 dark:border-neutral-800 shadow-sm">
        <CardContent className="p-3">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-bold">Schema Editor</div>
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) =>
                value && setViewMode(value as "visual" | "json")
              }
              className="bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-md"
            >
              <ToggleGroupItem
                value="visual"
                aria-label="Visual Editor"
                className="h-6 px-2 text-xs data-[state=on]:bg-white dark:data-[state=on]:bg-neutral-900"
              >
                <Eye className="h-3 w-3 mr-1" />
                Visual
              </ToggleGroupItem>
              <ToggleGroupItem
                value="json"
                aria-label="JSON View"
                className="h-6 px-2 text-xs data-[state=on]:bg-white dark:data-[state=on]:bg-neutral-900"
              >
                <Code className="h-3 w-3 mr-1" />
                JSON
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {viewMode === "visual" ? (
            <SchemaEditor schema={schema} onUpdate={setSchema} />
          ) : (
            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-md p-2 overflow-hidden">
              <pre className="text-xs overflow-auto max-h-[70vh] p-2 font-mono">
                {JSON.stringify(schema, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
