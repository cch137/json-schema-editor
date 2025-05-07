"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { RefreshCw, Plus, Pencil, Trash2, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";
import {
  fetchSchemaList,
  createSchema,
  deleteSchema,
  renameSchema,
} from "@/lib/api";
import type { SchemaListItem } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export default function SchemaListPage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [schemas, setSchemas] = useState<SchemaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [schemaToRename, setSchemaToRename] = useState<SchemaListItem | null>(
    null
  );
  const [newName, setNewName] = useState("");

  const fetchSchemas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSchemaList();
      setSchemas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch schemas");
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to fetch schemas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchemas();
  }, [fetchSchemas]);

  const handleCreateSchema = useCallback(async () => {
    setIsCreating(true);
    try {
      const initialSchema = {
        type: "object",
        properties: {},
      };

      const newSchema = await createSchema({
        name: newSchemaName || "New Schema",
        json: initialSchema,
        metadata: {},
      });

      toast({
        title: "Success",
        description: "Schema created successfully",
      });

      router.push(`/${newSchema.uuid}`);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to create schema",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
      setNewSchemaName("");
    }
  }, [newSchemaName, router]);

  const handleDeleteSchema = useCallback(
    async (uuid: string) => {
      try {
        await deleteSchema(uuid);
        toast({
          title: "Success",
          description: "Schema deleted successfully",
        });
        fetchSchemas();
      } catch (err) {
        toast({
          title: "Error",
          description:
            err instanceof Error ? err.message : "Failed to delete schema",
          variant: "destructive",
        });
      }
    },
    [fetchSchemas]
  );

  const handleRenameSchema = useCallback(async () => {
    if (!schemaToRename) return;

    try {
      await renameSchema(schemaToRename.uuid, newName);
      toast({
        title: "Success",
        description: "Schema renamed successfully",
      });
      fetchSchemas();
      setRenameDialogOpen(false);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to rename schema",
        variant: "destructive",
      });
    }
  }, [schemaToRename, newName, fetchSchemas]);

  const openRenameDialog = useCallback((schema: SchemaListItem) => {
    setSchemaToRename(schema);
    setNewName(schema.name);
    setRenameDialogOpen(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  }, []);

  const sortedSchemas = useMemo(() => {
    return [...schemas].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [schemas]);

  return (
    <div className="p-3 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-bold">Schema Manager</h1>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={toggleTheme}>
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSchemas}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card className="mb-3">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>My Schemas</CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Create New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Schema</DialogTitle>
                  <DialogDescription>
                    Enter a name for your new schema.
                  </DialogDescription>
                </DialogHeader>
                <Input
                  placeholder="Schema Name"
                  value={newSchemaName}
                  onChange={(e) => setNewSchemaName(e.target.value)}
                />
                <DialogFooter>
                  <Button onClick={handleCreateSchema} disabled={isCreating}>
                    {isCreating ? (
                      <LoadingSpinner className="h-4 w-4 mr-2" />
                    ) : null}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !schemas.length ? (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner className="h-8 w-8" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : schemas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No schemas found. Create one to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {sortedSchemas.map((schema) => (
                <div
                  key={schema.uuid}
                  className="p-3 border border-neutral-200 dark:border-neutral-800 rounded-md flex justify-between items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 hover:shadow-md transition-all duration-200 ease-in-out cursor-pointer"
                  onClick={(e) => {
                    if (
                      e.target instanceof HTMLElement &&
                      !e.target.closest("button") &&
                      !e.target.closest("a")
                    ) {
                      router.push(`/${schema.uuid}`);
                    }
                  }}
                >
                  <div className="flex-1">
                    <Link
                      href={`/${schema.uuid}`}
                      prefetch={false}
                      className="block font-medium text-base hover:underline py-2 px-4 -mx-4 -my-2"
                    >
                      {schema.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      Updated: {formatDate(schema.updated_at)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        openRenameDialog(schema);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Schema</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{schema.name}"?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteSchema(schema.uuid)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Schema</DialogTitle>
            <DialogDescription>
              Enter a new name for this schema.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="New Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={handleRenameSchema}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
