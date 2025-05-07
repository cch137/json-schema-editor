"use client";

import { useState, useEffect, useCallback, useMemo, use, Usable } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  PlusCircle,
  Trash2,
  Download,
  Copy,
  Moon,
  Sun,
  ArrowLeft,
  Save,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useTheme } from "next-themes";
import Link from "next/link";
import { fetchSchemaDetail, updateSchema, deleteSchema } from "@/lib/api";
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

export default function SchemaDetailPage({
  params,
}: {
  params: Usable<{ uuid: string }>;
}) {
  const { uuid } = use<{ uuid: string }>(params);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [schemaDetail, setSchemaDetail] = useState<SchemaDetail | null>(null);
  const [schema, setSchema] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSchemaDetail(uuid);
      setSchemaDetail(data);
      setSchema(data.json);
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

  const addProperty = useCallback(() => {
    setSchema((prevSchema: any) => ({
      ...prevSchema,
      properties: {
        ...prevSchema.properties,
        [`newProperty${Object.keys(prevSchema.properties || {}).length + 1}`]: {
          type: "string",
          title: "New Property",
        },
      },
    }));
  }, []);

  const removeProperty = useCallback((key: string) => {
    setSchema((prevSchema: any) => {
      const newProperties = { ...prevSchema.properties };
      delete newProperties[key];

      // Also remove from required if it's there
      const newRequired = prevSchema.required
        ? prevSchema.required.filter((item: string) => item !== key)
        : [];

      return {
        ...prevSchema,
        properties: newProperties,
        required: newRequired,
      };
    });
  }, []);

  const updateProperty = useCallback(
    (key: string, field: string, value: any) => {
      setSchema((prevSchema: any) => ({
        ...prevSchema,
        properties: {
          ...prevSchema.properties,
          [key]: {
            ...prevSchema.properties[key],
            [field]: value,
          },
        },
      }));
    },
    []
  );

  const renameProperty = useCallback((oldKey: string, newKey: string) => {
    if (oldKey === newKey || !newKey.trim()) return;

    setSchema((prevSchema: any) => {
      const newProperties: any = {};
      Object.entries(prevSchema.properties).forEach(([key, value]) => {
        if (key === oldKey) {
          newProperties[newKey] = value;
        } else {
          newProperties[key] = value;
        }
      });

      // Update required array if the property is required
      const newRequired = prevSchema.required
        ? prevSchema.required.map((key: string) =>
            key === oldKey ? newKey : key
          )
        : [];

      return {
        ...prevSchema,
        properties: newProperties,
        required: newRequired,
      };
    });
  }, []);

  const toggleRequired = useCallback((key: string) => {
    setSchema((prevSchema: any) => {
      const currentRequired = prevSchema.required || [];
      const newRequired = currentRequired.includes(key)
        ? currentRequired.filter((item: string) => item !== key)
        : [...currentRequired, key];

      return {
        ...prevSchema,
        required: newRequired,
      };
    });
  }, []);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
    toast({
      title: "Copied to clipboard",
      description: "JSON Schema has been copied to clipboard",
    });
  }, [schema]);

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

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const sortedProperties = useMemo(() => {
    if (!schema?.properties) return [];
    return Object.entries(schema.properties);
  }, [schema?.properties]);

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
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" prefetch={false}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <h1 className="text-xl font-bold">{schemaDetail.name}</h1>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={toggleTheme}>
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
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
          <Button size="sm" onClick={saveSchema} disabled={saving}>
            {saving ? (
              <LoadingSpinner className="h-4 w-4 mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>

      <Card className="mb-3">
        <CardContent className="p-3">
          <div className="space-y-3">
            {sortedProperties.map(([key, prop]: [string, any]) => (
              <div
                key={key}
                className="p-2 border border-neutral-200 dark:border-neutral-800 rounded-md relative"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => removeProperty(key)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>

                <div className="grid grid-cols-2 gap-2 pr-6">
                  <div className="space-y-1">
                    <Label htmlFor={`${key}-name`} className="text-xs">
                      Property Name
                    </Label>
                    <Input
                      id={`${key}-name`}
                      value={key}
                      onChange={(e) => {
                        renameProperty(key, e.target.value);
                        setTimeout(() => e.currentTarget.focus(), 1);
                      }}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`${key}-title`} className="text-xs">
                      Display Title
                    </Label>
                    <Input
                      id={`${key}-title`}
                      value={prop.title || ""}
                      onChange={(e) =>
                        updateProperty(key, "title", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`${key}-type`} className="text-xs">
                      Type
                    </Label>
                    <Select
                      value={prop.type}
                      onValueChange={(value) =>
                        updateProperty(key, "type", value)
                      }
                    >
                      <SelectTrigger id={`${key}-type`} className="h-8 text-sm">
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
                      id={`${key}-required`}
                      checked={schema.required?.includes(key) || false}
                      onCheckedChange={() => toggleRequired(key)}
                    />
                    <Label htmlFor={`${key}-required`} className="text-xs">
                      Required
                    </Label>
                  </div>

                  {prop.type === "string" && (
                    <div className="space-y-1 col-span-2">
                      <Label htmlFor={`${key}-enum`} className="text-xs">
                        Enum Values (comma separated)
                      </Label>
                      <Input
                        id={`${key}-enum`}
                        value={prop.enum ? prop.enum.join(", ") : ""}
                        onChange={(e) => {
                          const enumValues = e.target.value
                            ? e.target.value.split(",").map((v) => v.trim())
                            : undefined;
                          updateProperty(key, "enum", enumValues);
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
                        <Label
                          htmlFor={`${key}-description`}
                          className="text-xs"
                        >
                          Description
                        </Label>
                        <Input
                          id={`${key}-description`}
                          value={prop.description || ""}
                          onChange={(e) =>
                            updateProperty(key, "description", e.target.value)
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`${key}-default`} className="text-xs">
                          Default Value
                        </Label>
                        <Input
                          id={`${key}-default`}
                          value={prop.default || ""}
                          onChange={(e) =>
                            updateProperty(key, "default", e.target.value)
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </>
                  )}

                  {prop.type === "boolean" && (
                    <div className="space-y-1">
                      <Label htmlFor={`${key}-default`} className="text-xs">
                        Default Value
                      </Label>
                      <Select
                        value={prop.default?.toString() || "false"}
                        onValueChange={(value) =>
                          updateProperty(key, "default", value === "true")
                        }
                      >
                        <SelectTrigger
                          id={`${key}-default`}
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
                  )}
                </div>
              </div>
            ))}

            <Button
              onClick={addProperty}
              size="sm"
              variant="outline"
              className="w-full"
            >
              <PlusCircle className="mr-2 h-3 w-3" />
              Add Property
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <pre className="text-xs overflow-auto bg-muted p-2 rounded-md max-h-60">
            {JSON.stringify(schema, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
