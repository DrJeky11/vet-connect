import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid gap-3">
      <h1 className="text-3xl font-bold">We could not find that page</h1>
      <p>
        <Link href="/resources">Go to the directory</Link>
      </p>
    </div>
  );
}
