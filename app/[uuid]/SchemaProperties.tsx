"use client";

import { Button } from "@/components/ui/button";
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
import { Trash2, PlusCircle } from "lucide-react";
import { useRef, useState, useEffect } from "react";

type PropertyType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array";

interface PropertyItemProps {
  propKey: string;
  prop: {
    type: PropertyType;
    title?: string;
    description?: string;
    default?: any;
    enum?: string[];
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
  index: number;
}

const PropertyItem = ({
  propKey,
  prop,
  schema,
  onRemoveProperty,
  onUpdateProperty,
  onRenameProperty,
  onToggleRequired,
  index,
}: PropertyItemProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tempKey, setTempKey] = useState(propKey);

  useEffect(() => {
    setTempKey(propKey);
  }, [propKey]);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setTempKey(newKey);
    // Update schema immediately by simulating a rename
    if (newKey !== propKey && newKey.trim() !== "") {
      onRenameProperty(propKey, newKey);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tempKey !== propKey && tempKey.trim() !== "") {
      onRenameProperty(propKey, tempKey);
      inputRef.current?.focus();
    }
  };

  const handleBlur = () => {
    if (tempKey !== propKey && tempKey.trim() !== "") {
      onRenameProperty(propKey, tempKey);
    } else if (tempKey.trim() === "") {
      setTempKey(propKey); // Revert to original key if empty
    }
  };

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
        <div className="space-y-1">
          <Label htmlFor={`${propKey}-name`} className="text-xs">
            Property Name
          </Label>
          <Input
            id={`${propKey}-name`}
            value={tempKey}
            onChange={handleKeyChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="h-8 text-sm"
            ref={inputRef}
          />
        </div>

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

        <div className="space-y-1">
          <Label htmlFor={`${propKey}-type`} className="text-xs">
            Type
          </Label>
          <Select
            value={prop.type}
            onValueChange={(value) => onUpdateProperty(propKey, "type", value)}
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

        {prop.type === "string" && (
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
        )}

        {(prop.type === "string" ||
          prop.type === "number" ||
          prop.type === "integer") && (
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
                value={prop.default?.toString() || ""}
                onChange={(e) =>
                  onUpdateProperty(propKey, "default", e.target.value)
                }
                className="h-8 text-sm"
              />
            </div>
          </>
        )}

        {prop.type === "boolean" && (
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
              <SelectTrigger id={`${propKey}-default`} className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">True</SelectItem>
                <SelectItem value="false">False</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
};

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
}

export const SchemaProperties = ({
  sortedProperties,
  schema,
  onRemoveProperty,
  onUpdateProperty,
  onRenameProperty,
  onToggleRequired,
  onAddProperty,
}: SchemaPropertiesProps) => {
  return (
    <div className="space-y-3">
      {sortedProperties.map(([key, prop], index) => (
        <PropertyItem
          key={index} // Use index as key to maintain component stability
          index={index}
          propKey={key}
          prop={prop}
          schema={schema}
          onRemoveProperty={onRemoveProperty}
          onUpdateProperty={onUpdateProperty}
          onRenameProperty={onRenameProperty}
          onToggleRequired={onToggleRequired}
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
};
