"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Loader2, PlusCircle } from "lucide-react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ProjectCard from "./ProjectCard";
import Modal from "@/components/ui/Modal";

export default function DashboardClient({ initialProjects, user }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects || []);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const filtered = search.trim()
    ? projects.filter((p) =>
        p.title.toLowerCase().includes(search.trim().toLowerCase())
      )
    : projects;

  const handleCreate = async () => {
    if (!createTitle.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: createTitle.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo crear el proyecto");
      }
      setCreateOpen(false);
      setCreateTitle("");
      router.push(`/dashboard/studio/${json.project.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (project) => {
    if (
      !window.confirm(
        `¿Eliminar "${project.title}"? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={`Hola, ${user?.name?.split(" ")[0] || "productor"}`}
          subtitle="Gestiona tus proyectos de producción"
          showSearch
          search={search}
          onSearch={setSearch}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400">
              Tus proyectos {projects.length > 0 && `(${projects.length})`}
            </h2>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              <PlusCircle className="h-4 w-4" />
              Nuevo proyecto
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="grid place-items-center rounded-2xl border border-dashed border-[#3c3c3c]/10 bg-[#3c3c3c]/[0.03] py-20 text-center">
              <FolderOpen className="mb-3 h-10 w-10 text-stone-600" />
              <p className="text-sm text-stone-400">
                {search
                  ? `Sin resultados para "${search}"`
                  : "Aún no tienes proyectos"}
              </p>
              {!search && (
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Crear tu primer proyecto
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <Modal
        open={createOpen}
        title="Nuevo proyecto"
        onClose={() => setCreateOpen(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <label
            htmlFor="project-title"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-stone-400"
          >
            Título del proyecto
          </label>
          <input
            id="project-title"
            type="text"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            placeholder="Ej. Mi primera mezcla"
            autoFocus
            className="w-full rounded-lg border border-[#3c3c3c]/10 bg-[#3c3c3c]/[0.04] px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:border-indigo-400/60 focus:outline-none"
          />
          {error && (
            <p className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
              {error}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-[#3c3c3c]/10 px-4 py-2 text-sm font-semibold text-stone-300 hover:bg-[#3c3c3c]/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!createTitle.trim() || creating}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
