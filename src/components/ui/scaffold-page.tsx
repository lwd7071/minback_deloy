type ScaffoldPageProps = {
  owner: "Dev A" | "Dev B";
  title: string;
  description: string;
};

export function ScaffoldPage({ owner, title, description }: ScaffoldPageProps) {
  return (
    <section className="surface">
      <p className="eyebrow">{owner}</p>
      <h1>{title}</h1>
      <p className="muted">{description}</p>
    </section>
  );
}
