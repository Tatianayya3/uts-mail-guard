"use client";

import { useActionState, useMemo, useState } from "react";
import { createUser, type CreateUserState } from "./actions";

type User = {
  id: number;
  email: string;
  username: string | null;
  name: string | null;
  createdAt: string;
};

const initialState: CreateUserState = {};

function initials(user: User) {
  return (user.name || user.username || user.email)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function UserDirectory({ users }: { users: User[] }) {
  const [query, setQuery] = useState("");
  const [state, formAction, pending] = useActionState(createUser, initialState);
  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return users;
    return users.filter((user) =>
      [user.name, user.username, user.email].some((value) =>
        value?.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [query, users]);

  return (
    <>
      <section className="stats-grid" aria-label="Resumen de usuarios">
        <div className="stat-card stat-card-accent">
          <span>Total de usuarios</span>
          <strong>{users.length}</strong>
          <small>en el workspace</small>
        </div>
        <div className="stat-card">
          <span>Con nombre asignado</span>
          <strong>{users.filter((user) => user.name).length}</strong>
          <small>perfiles completos</small>
        </div>
        <div className="stat-card">
          <span>Último registro</span>
          <strong>
            {users.length
              ? new Intl.DateTimeFormat("es-ES", {
                  day: "2-digit",
                  month: "short",
                }).format(new Date(users[0].createdAt))
              : "--"}
          </strong>
          <small>fecha de alta</small>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel users-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Directory</p>
              <h2>
                Todos los usuarios <span>{users.length}</span>
              </h2>
            </div>
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar usuario..."
                aria-label="Buscar usuario"
              />
            </label>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo electrónico</th>
                  <th>Alta</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="avatar">{initials(user)}</div>
                        <div>
                          <strong>{user.name || "Sin nombre"}</strong>
                          <small>
                            {user.username
                              ? `@${user.username}`
                              : "Sin username"}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td className="muted-cell">{user.email}</td>
                    <td className="muted-cell">
                      {new Intl.DateTimeFormat("es-ES", {
                        dateStyle: "medium",
                      }).format(new Date(user.createdAt))}
                    </td>
                    <td>
                      <span className="status-pill">
                        <i />
                        Activo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredUsers.length && (
              <div className="empty-state">
                <strong>No hay coincidencias</strong>
                <span>Prueba con otro nombre o correo.</span>
              </div>
            )}
          </div>
        </div>

        <aside className="panel create-panel">
          <p className="eyebrow">New profile</p>
          <h2>Crear usuario</h2>
          <p className="panel-copy">
            Añade una persona al directorio de tu extensión.
          </p>
          <form action={formAction} className="user-form">
            <label>
              Nombre completo
              <input name="name" placeholder="Ej. Ana García" />
            </label>
            <label>
              Username <span>(opcional)</span>
              <input name="username" placeholder="ana.garcia" />
            </label>
            <label>
              Correo electrónico
              <input
                name="email"
                type="email"
                placeholder="ana@empresa.com"
                required
              />
            </label>
            {state.error && (
              <p className="form-message error" role="alert">
                {state.error}
              </p>
            )}
            {state.success && (
              <p className="form-message success" role="status">
                {state.success}
              </p>
            )}
            <button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Añadir usuario"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </aside>
      </section>
    </>
  );
}
