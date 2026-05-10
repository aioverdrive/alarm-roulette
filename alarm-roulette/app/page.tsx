import type { Metadata } from "next";
import LandingClient from "./LandingClient";

export const metadata: Metadata = {
  title: "Alarm Roulette Signup",
  description: "Sign up with Google using Supabase Auth",
};

export default function Page() {
  return <LandingClient />;
}