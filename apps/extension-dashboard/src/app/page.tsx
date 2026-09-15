import { db } from "@/prisma/db";
import UserDirectory from "./user-directory";

export const dynamic = "force-dynamic";

export default async function Home() {
  const users = await db.orm.public.User.all();

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">
          MG
        </div>
        <div>
          <p className="eyebrow">Mail Guard / Workspace</p>
          <p className="topbar-title">Extension dashboard</p>
        </div>
        <div className="topbar-status">
          <span /> Sistema operativo
        </div>
      </header>
      <section className="page-heading">
        <div>
          <p className="eyebrow">People directory</p>
          <h1>Usuarios</h1>
          <p className="page-lead">
            Administra las personas que tienen acceso a tu extensión.
          </p>
        </div>
        <div className="heading-date">
          Última actualización
          <br />
          <strong>
            {new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(
              new Date(),
            )}
          </strong>
        </div>
      </section>
      <UserDirectory users={users} />
    </main>
  );
}
