"use client";

import { useState, useEffect, useCallback, useMemo, use, Usable } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Download,
  Copy,
  Moon,
  Sun,
  ArrowLeft,
  Save,
  Trash2,
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
import { SchemaProperties } from "./SchemaProperties";

interface SchemaDetailPageProps {
  params: Usable<{ uuid: string }>;
}

export default function SchemaDetailPage({ params }: SchemaDetailPageProps) {
  const { uuid } = use(params);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [schemaDetail, setSchemaDetail] = useState<SchemaDetail | null>(null);
  const [schema, setSchema] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
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

  // Determine if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!schemaDetail || !schema) return false;
    return JSON.stringify(schema) !== JSON.stringify(schemaDetail.json);
  }, [schema, schemaDetail]);

  // Handle onbeforeunload for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = ""; // Modern browsers require this to show the prompt
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

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
      const newProperties: Record<string, any> = {};
      Object.entries(prevSchema.properties).forEach(([key, value]) => {
        if (key === oldKey) {
          newProperties[newKey] = value;
        } else {
          newProperties[key] = value;
        }
      });

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
      // Update schemaDetail to reflect saved state
      setSchemaDetail((prev) => (prev ? { ...prev, json: schema } : prev));
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
    if (!schema?.properties) return [] as [string, any][];
    return Object.entries(schema.properties) as [string, any][];
  }, [schema?.properties]);

  const handleBackNavigation = useCallback(() => {
    router.push("/");
  }, [router]);

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
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
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
                  <AlertDialogCancel onClick={handleBackNavigation}>
                    Discard Changes
                  </AlertDialogCancel>
                  <AlertDialogAction>Cancel</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" prefetch={false}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
          )}
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

      <Card className="mb-3">
        <CardContent className="p-3">
          <SchemaProperties
            sortedProperties={sortedProperties}
            schema={schema}
            onRemoveProperty={removeProperty}
            onUpdateProperty={updateProperty}
            onRenameProperty={renameProperty}
            onToggleRequired={toggleRequired}
            onAddProperty={addProperty}
          />
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
