import type { IncidentType, Severity } from "@bantaybuhay/shared";
import {
  BadgeCheck,
  BookOpen,
  Cpu,
  Database,
  EyeOff,
  HeartPulse,
  History,
  Map as MapIcon,
  MapPin,
  ScanEye,
  Send,
  ShieldCheck,
  Smartphone,
  TimerOff,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { linkTo } from "../lib/router";
import {
  AlertBanner,
  Button,
  IconTile,
  LinkButton,
  ListCard,
  MapPill,
  SEVERITY_WORD,
  SeverityBadge,
  STROKE,
  ThemeToggle,
  cx,
  incidentIcon,
  useTheme,
} from "../ui";
import { BARANGAY_COUNT, BarangayMap, CITY_AREA_KM2 } from "./BarangayMap";
import { ConsolePreview, PREVIEW_INCIDENTS } from "./ConsolePreview";

// One column edge for every section, so left and right edges line up down the page.
const WRAP = "mx-auto w-full max-w-[1200px] px-4 sm:px-8";
// On wide screens each section fills one screen; the heading sits at the top of it.
const SECTION = "scroll-mt-20 py-20 lg:flex lg:min-h-svh lg:flex-col lg:py-28";
const H2 = "font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[44px]";
const LEAD = "mt-4 max-w-[60ch] text-[17px] text-fg-2";
const icon = (Icon: typeof MapPin) => <Icon aria-hidden="true" size={24} strokeWidth={STROKE} />;

const NAV = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#console", label: "Console" },
  { href: "#coverage", label: "Coverage" },
  { href: "#privacy", label: "Privacy" },
];

function Section({ id, title, lead, children }: { id: string; title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={SECTION}>
      <div className={WRAP}>
        <h2 id={`${id}-title`} className={H2}>
          {title}
        </h2>
        {lead && <p className={LEAD}>{lead}</p>}
        <div className="mt-10 lg:mt-14">{children}</div>
      </div>
    </section>
  );
}

function Header() {
  const { theme, setTheme } = useTheme();
  return (
    <header className="fixed inset-x-0 top-3 z-40">
      <div className={WRAP}>
        <nav aria-label="Main" className="glass flex items-center gap-2 rounded-full py-2 pr-2 pl-5 shadow-soft">
          <a {...linkTo("/")} className="mr-auto font-display text-[17px] font-semibold tracking-[-0.01em]">
            BantayBuhay
          </a>
          <ul className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-full px-4 font-display text-[15px] font-medium text-fg-2 transition-colors duration-200 hover:bg-card-muted hover:text-fg"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <ThemeToggle theme={theme} onChange={setTheme} />
          <LinkButton href="#sign-in">Sign in</LinkButton>
        </nav>
      </div>
    </header>
  );
}

// A still of the console at the moment a camera raises an alert. It's a picture of the product,
// so it isn't focusable; the console preview further down is the one to try.
function HeroPreview() {
  const [first, second] = PREVIEW_INCIDENTS;
  return (
    <div role="img" aria-label="The BantayBuhay console raising a person-down alert in Binicuil" className="relative">
      <div inert className="glass space-y-3 rounded-panel p-4 shadow-float sm:p-5">
        <AlertBanner
          title="New high incident: Person down"
          actions={
            <Button variant="secondary" tabIndex={-1}>
              Open
            </Button>
          }
        >
          {first!.barangay}, {first!.ago}
        </AlertBanner>
        {[first!, second!].map((item, index) => (
          <ListCard
            key={item.id}
            title={item.type === "person_down" ? "Person down" : "Fire or smoke"}
            meta={`${item.barangay}, ${item.ago}`}
            note={item.status === "detected" ? "Not acknowledged" : "Dispatched"}
            tile={incidentIcon(item.type)}
            severity={item.severity}
            selected={index === 0}
          />
        ))}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="flex min-h-svh items-center pt-28 pb-16 lg:pt-24">
      <div className={cx(WRAP, "grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]")}>
        <div>
          <h1
            id="hero-title"
            className="font-display text-[clamp(40px,6vw,68px)] font-semibold leading-[1.02] tracking-[-0.025em]"
          >
            Incident detection and response for Kabankalan City
          </h1>
          <p className="mt-6 max-w-[46ch] text-[18px] text-fg-2">
            Cameras flag emergencies as they happen. A DRRM operator checks each alert, assigns responders and
            follows the incident on a map of all {BARANGAY_COUNT} barangays.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="#sign-in" size="lg">
              Sign in to BantayBuhay
            </LinkButton>
            <LinkButton href="#how-it-works" size="lg" variant="secondary">
              See how it works
            </LinkButton>
          </div>
        </div>
        <HeroPreview />
      </div>
    </section>
  );
}

const STEPS: { title: string; body: string; icon: ReactNode }[] = [
  { title: "Flags an emergency", body: "The detector reports what persists across frames, with a snapshot.", icon: icon(ScanEye) },
  { title: "Confirms it's real", body: "An operator checks it. Unsure detections wait for review.", icon: icon(BadgeCheck) },
  { title: "Places it on the map", body: "It appears in its barangay on every operator's screen within a second.", icon: icon(MapPin) },
  { title: "Sends responders", body: "The operator assigns responders, then swipes to dispatch.", icon: icon(Send) },
  { title: "Tracks it to the end", body: "Responders mark on scene and resolved. The history stays.", icon: icon(History) },
];

function HowItWorks() {
  return (
    <Section id="how-it-works" title="Five steps from camera to scene" lead="Every change is recorded with who made it and when.">
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className={cx(
              "flex flex-col rounded-panel p-6 shadow-soft lg:min-h-[400px]",
              index === STEPS.length - 1 ? "bg-inverse text-on-inverse" : "bg-card",
            )}
          >
            <span aria-hidden="true" className="font-display text-[56px] font-light leading-none tabular-nums">
              {index + 1}
            </span>
            <div className="mt-6 lg:mt-auto">
              <IconTile size={56} tone={index === STEPS.length - 1 ? "card" : "muted"}>
                {step.icon}
              </IconTile>
              <h3 className="mt-6 font-display text-[18px] font-medium leading-tight">{step.title}</h3>
              <p className={cx("mt-2 text-[15px]", index === STEPS.length - 1 ? "text-on-inverse-2" : "text-fg-2")}>
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function ConsoleSection() {
  return (
    <Section
      id="console"
      title="The operator console"
      lead="Live incidents, the barangay map and each incident's next step on one screen for the operations center. Select an incident to open it."
    >
      <ConsolePreview />
    </Section>
  );
}

const DETECTORS: { type: IncidentType; label: string; ready: boolean }[] = [
  { type: "person_down", label: "Person down", ready: true },
  { type: "fire_smoke", label: "Fire and smoke", ready: false },
  { type: "flood", label: "Flooding", ready: false },
  { type: "sos_gesture", label: "SOS hand signal", ready: false },
];

function FeatureCard({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-panel bg-card p-6 shadow-soft sm:p-8">
      <div className="min-h-[188px] flex-1">{children}</div>
      <h3 className="mt-8 font-display text-[21px] font-medium leading-tight">{title}</h3>
      <p className="mt-2 max-w-[48ch] text-[15px] text-fg-2">{body}</p>
    </div>
  );
}

function Features() {
  return (
    <Section id="features" title="Built for an operations center">
      <div className="grid gap-4 md:grid-cols-2">
        <FeatureCard title="Detects four kinds of emergency" body="Person down works today. Fire and smoke, flooding and the SOS hand signal are in development.">
          <ul className="grid gap-2 sm:grid-cols-2">
            {DETECTORS.map((item) => (
              <li key={item.type} className="flex items-center gap-3 rounded-card bg-card-muted p-3">
                <IconTile size={40}>{incidentIcon(item.type, 20)}</IconTile>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[15px] font-medium leading-tight">{item.label}</span>
                  <span className={cx("text-[13px]", item.ready ? "font-bold text-fg" : "text-fg-2")}>
                    {item.ready ? "Working" : "In development"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </FeatureCard>

        <FeatureCard title="Asks a person before it alerts" body="From 60% confidence the alert goes out at once. From 35%, it waits for an operator to confirm.">
          <div aria-hidden="true" className="pt-6">
            <div className="flex h-14 overflow-hidden rounded-control text-[13px] font-bold">
              <span className="flex w-[35%] items-center justify-center bg-card-muted text-fg-2">Ignored</span>
              <span className="flex w-[25%] items-center justify-center bg-info-soft text-info">Review</span>
              <span className="flex w-[40%] items-center justify-center bg-critical-banner text-on-critical-banner">Alert</span>
            </div>
            <div className="relative mt-2 h-5 text-[13px] tabular-nums text-fg-2">
              <span className="absolute left-0">0%</span>
              <span className="absolute left-[35%] -translate-x-1/2">35%</span>
              <span className="absolute left-[60%] -translate-x-1/2">60%</span>
              <span className="absolute right-0">100%</span>
            </div>
          </div>
        </FeatureCard>

        <FeatureCard title="Shows responders only their own" body="A responder sees an incident only while assigned to it. The database enforces this, not just the screen.">
          <div inert aria-hidden="true" className="space-y-2">
            <ListCard
              title="Fire or smoke"
              meta="Tagukon, assigned to you"
              note="Dispatched"
              tile={incidentIcon("fire_smoke")}
              severity="critical"
            />
            <div className="flex items-center gap-4 rounded-card border border-dashed border-border-ui p-3 text-fg-2">
              <IconTile size={56} tone="muted">
                <EyeOff aria-hidden="true" size={24} strokeWidth={STROKE} />
              </IconTile>
              <span className="text-[15px]">Incidents not assigned to you aren't sent at all</span>
            </div>
          </div>
        </FeatureCard>

        <FeatureCard title="Works on a responder's phone" body="Responders see their incidents and the map, and mark on scene with one tap.">
          <div aria-hidden="true" className="flex justify-center">
            <div className="w-[230px] rounded-[32px] bg-inverse p-2 shadow-lift">
              <div className="space-y-2 rounded-[26px] bg-canvas p-3">
                <p className="px-1 font-display text-[13px] font-medium text-fg-2">Your assignments</p>
                <div className="rounded-card bg-card p-3">
                  <SeverityBadge severity="critical" size="sm" />
                  <p className="mt-2 font-display text-[15px] font-medium">Fire or smoke</p>
                  <p className="text-[13px] text-fg-2">Tagukon</p>
                </div>
                <span className="flex min-h-11 items-center justify-center rounded-full bg-inverse font-display text-[15px] font-medium text-on-inverse">
                  I'm on scene
                </span>
              </div>
            </div>
          </div>
        </FeatureCard>
      </div>
    </Section>
  );
}

const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

function Coverage() {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <Section
      id="coverage"
      title={`All ${BARANGAY_COUNT} barangays of Kabankalan City`}
      lead="Each incident is placed in the barangay it happens in, using official boundaries from NAMRIA and PSA."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="relative rounded-panel bg-card p-4 shadow-soft sm:p-8">
          <div className="mx-auto h-[min(70vw,520px)] w-full lg:h-[min(58vh,560px)]">
            <BarangayMap
              label={`Map of the ${BARANGAY_COUNT} barangays of Kabankalan City`}
              highlighted={hovered}
              onHover={setHovered}
            />
          </div>
          <div aria-live="polite" className="pointer-events-none absolute top-5 left-5 min-h-7">
            {hovered && <MapPill>{hovered}</MapPill>}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-panel bg-card p-6 shadow-soft sm:p-8">
            <div className="flex flex-wrap gap-x-10 gap-y-6">
              <p>
                <span className="block font-display text-[48px] font-light leading-none tabular-nums">{BARANGAY_COUNT}</span>
                <span className="mt-2 block text-[15px] text-fg-2">barangays mapped</span>
              </p>
              <p>
                <span className="block font-display text-[48px] font-light leading-none tabular-nums">
                  {CITY_AREA_KM2}
                  <span className="text-[24px]"> km²</span>
                </span>
                <span className="mt-2 block text-[15px] text-fg-2">of city covered</span>
              </p>
            </div>
          </div>
          <div className="flex-1 rounded-panel bg-card p-6 shadow-soft sm:p-8">
            <h3 className="font-display text-[18px] font-medium">Severity on the map</h3>
            <p className="mt-2 text-[15px] text-fg-2">Yellow, orange and red follow PAGASA warning colors. Each level also has its own shape.</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {SEVERITIES.map((level) => (
                <li key={level}>
                  <SeverityBadge severity={level} />
                  <span className="sr-only"> {SEVERITY_WORD[level]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}

const SOURCES: { title: string; body: string; icon: ReactNode }[] = [
  { title: "Barangay boundaries", body: "NAMRIA and PSA, CC BY-IGO 3.0, via OCHA", icon: icon(MapIcon) },
  { title: "Warning colors", body: "PAGASA's yellow, orange and red levels", icon: icon(ShieldCheck) },
  { title: "Detection model", body: "D-FINE-N, Apache 2.0, running on our own server", icon: icon(Cpu) },
  { title: "Data hosting", body: "Supabase, in its Singapore region", icon: icon(Database) },
];

function About() {
  return (
    <section id="about" aria-labelledby="about-title" className={SECTION}>
      <div className={cx(WRAP, "grid gap-10 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-start")}>
        <div>
          <h2 id="about-title" className={H2}>
            Who builds BantayBuhay
          </h2>
          <p className={LEAD}>
            A college team builds BantayBuhay for the TALISIK Hackathon 2026, Track 2: disaster risk reduction and
            management.
          </p>
          <p className="mt-4 max-w-[60ch] text-[17px] font-bold">
            It isn't affiliated with or endorsed by the City Government of Kabankalan.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {SOURCES.map((source) => (
            <li key={source.title} className="flex flex-col rounded-panel bg-card p-6 shadow-soft lg:min-h-[230px]">
              <IconTile size={56} tone="muted">
                {source.icon}
              </IconTile>
              <h3 className="mt-6 font-display text-[18px] font-medium lg:mt-auto">{source.title}</h3>
              <p className="mt-1 text-[15px] text-fg-2">{source.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const PRIVACY: { title: string; body: string; icon: ReactNode }[] = [
  { title: "No facial recognition", body: "Cameras look for events, not identities. Civilians are linked by their own SOS, a QR medical ID or an operator search.", icon: icon(EyeOff) },
  { title: "Every snapshot view is logged", body: "Camera snapshots stay in private storage, and each view goes into an audit log that only administrators can read.", icon: icon(BookOpen) },
  { title: "Access ends with the assignment", body: "A responder loses access to an incident the moment they're released from it.", icon: icon(TimerOff) },
  { title: "Medical details for the assigned responder only", body: "When medical profiles launch, only the civilian and a responder on their active incident can read them.", icon: icon(HeartPulse) },
];

function Privacy() {
  return (
    <Section
      id="privacy"
      title="Privacy under the Data Privacy Act of 2012"
      lead="BantayBuhay handles camera images and, soon, medical details. Republic Act 10173 rules are built into the database, not left to the screen."
    >
      <ul className="grid gap-4 md:grid-cols-2">
        {PRIVACY.map((item) => (
          <li key={item.title} className="flex flex-col rounded-panel bg-card p-6 shadow-soft sm:p-8 lg:min-h-[250px]">
            <IconTile size={56} tone="muted">
              {item.icon}
            </IconTile>
            <h3 className="mt-6 font-display text-[21px] font-medium leading-tight lg:mt-auto">{item.title}</h3>
            <p className="mt-2 max-w-[52ch] text-[15px] text-fg-2">{item.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const ROLES: { as: string; title: string; body: string; action: string; icon: ReactNode }[] = [
  { as: "operator", title: "DRRM operators and administrators", body: "Run the operations console: alerts, the map, review and dispatch.", action: "Sign in as an operator", icon: icon(ShieldCheck) },
  { as: "responder", title: "Responders", body: "See the incidents assigned to you and update them from the field.", action: "Sign in as a responder", icon: icon(Users) },
  { as: "civilian", title: "Civilians", body: "Keep your account ready for emergency medical details.", action: "Sign in as a civilian", icon: icon(Smartphone) },
];

function SignIn() {
  return (
    <Section id="sign-in" title="Sign in to BantayBuhay" lead="Accounts are created by a BantayBuhay administrator. Choose your role to go to the right sign-in.">
      <ul className="grid gap-4 md:grid-cols-3">
        {ROLES.map((role) => (
          <li key={role.as} className="flex flex-col rounded-panel bg-card p-6 shadow-soft transition-[transform,box-shadow] duration-200 ease-out-soft hover:-translate-y-0.5 hover:shadow-lift sm:p-8">
            <IconTile size={56} tone={role.as === "operator" ? "inverse" : "muted"}>
              {role.icon}
            </IconTile>
            <h3 className="mt-6 font-display text-[21px] font-medium leading-tight">{role.title}</h3>
            <p className="mt-2 flex-1 text-[15px] text-fg-2">{role.body}</p>
            <LinkButton {...linkTo(`/login?as=${role.as}`)} variant={role.as === "operator" ? "primary" : "secondary"} fullWidth className="mt-8">
              {role.action}
            </LinkButton>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-hairline py-10">
      <div className={cx(WRAP, "flex flex-col gap-4 text-[13px] text-fg-2 md:flex-row md:items-center md:justify-between")}>
        <p>
          <span className="font-display text-[15px] font-semibold text-fg">BantayBuhay</span>, 2026. A TALISIK Hackathon project.
        </p>
        <nav aria-label="Footer" className="flex gap-1">
          <a href="#privacy" className="inline-flex min-h-11 items-center rounded-full px-3 hover:bg-card-muted hover:text-fg">
            Privacy
          </a>
          <a href="#sign-in" className="inline-flex min-h-11 items-center rounded-full px-3 hover:bg-card-muted hover:text-fg">
            Sign in
          </a>
        </nav>
        <p>Barangay boundaries: NAMRIA and PSA, CC BY-IGO 3.0, via OCHA.</p>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <div className="bg-canvas text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-inverse focus:px-4 focus:py-2 focus:text-on-inverse"
      >
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <HowItWorks />
        <ConsoleSection />
        <Features />
        <Coverage />
        <About />
        <Privacy />
        <SignIn />
      </main>
      <Footer />
    </div>
  );
}
