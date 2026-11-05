import type { Metadata } from "next";

export const metadata: Metadata = { title: "What is real and what is simulated" };

export default function About() {
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-bold">What is real and what is simulated</h1>
      <section>
        <h2 className="text-2xl font-bold">Real</h2>
        <ul className="ml-5 mt-2 list-disc">
          <li>Every listing is a real organization, and each one links to the public page it came from.</li>
          <li>Contact details appear only when a cited source states them. Empty fields stay empty.</li>
          <li>The Veterans Crisis Line numbers in the footer: dial 988 then press 1, or text 838255.</li>
        </ul>
      </section>
      <section>
        <h2 className="text-2xl font-bold">Simulated or limited</h2>
        <ul className="ml-5 mt-2 list-disc">
          <li>
            <strong>Verifier sign-in is simulated.</strong> It uses a shared demo passcode, not real accounts.
          </li>
          <li>There is no connection to any VA system. Nothing here books rides or appointments.</li>
          <li>Any people named in demo scripts (such as “Ray”, “Dana” or “Maria”) are fictional.</li>
          <li>On the hosted demo, verifier changes may reset when the server restarts.</li>
        </ul>
      </section>
      <section>
        <h2 className="text-2xl font-bold">What this site will not do</h2>
        <ul className="ml-5 mt-2 list-disc">
          <li>It does not decide who qualifies. Each provider sets its own rules. Call to confirm.</li>
          <li>It does not store names, service numbers, discharge status or any account.</li>
          <li>My Plan is saved only in this browser. A share link holds listing IDs and nothing else.</li>
        </ul>
      </section>
    </div>
  );
}
