"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowUpRight,
  Building2,
  Check,
  MessageCircle,
  UsersRound,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

// `useSearchParams` opts the component out of static prerendering
// unless it sits under a Suspense boundary. We split the form into
// a child component so the outer page can prerender the chrome
// (background, card frame) while the form hydrates with the query
// string on the client.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  // Forwarded from `/join/<token>` when the visitor already has an
  // account. After a successful sign-in we send them to the join
  // page to accept rather than to /dashboard.
  const inviteToken = searchParams.get("invite");
  const t = useTranslations("LoginPage");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Full-page navigation (not router.push) so the browser issues a
    // fresh top-level request that carries the just-written Supabase
    // auth cookies to the middleware gating /dashboard. A soft
    // client-side navigation can reach the protected route before the
    // server observes the new session, so the middleware bounces it
    // back to /login — which looks like the page "just refreshing"
    // instead of signing in (issue #365). Mirrors the deliberate full
    // reload the invite-accept flow already uses in join/[token].
    const destination = inviteToken
      ? `/join/${encodeURIComponent(inviteToken)}`
      : "/dashboard";
    window.location.href = destination;
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:gap-6 lg:p-6">
      <section className="relative hidden overflow-hidden rounded-xl border border-border bg-card px-8 py-8 text-foreground lg:flex lg:flex-col xl:px-12">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-border/70" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full border border-border/70" />
        <div className="relative z-10 flex items-center gap-3">
          <BrandMark className="h-10 w-10 text-primary" />
          <span className="text-lg font-semibold tracking-tight">Bharoxa</span>
        </div>
        <div className="relative z-10 my-auto max-w-xl py-16">
          <p className="mb-5 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-primary">
            <span className="h-px w-8 bg-primary" /> {t('eyebrow')}
          </p>
          <h1 className="max-w-lg text-4xl font-semibold leading-[1.08] tracking-tight xl:text-5xl">{t('heroTitle')}</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">{t('heroDescription')}</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              { icon: MessageCircle, text: t('featureInbox') },
              { icon: Building2, text: t('featureProperties') },
              { icon: UsersRound, text: t('featureTeam') },
              { icon: Check, text: t('featureFollowups') },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-foreground">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary"><Icon className="h-4 w-4" /></span>
                {text}
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-between border-t border-border pt-5 text-xs text-muted-foreground">
          <span>{t('footer')}</span>
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </section>

      <section className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-1 py-4 sm:px-2 lg:min-h-0 lg:py-0">
        <Card className="w-full max-w-md rounded-xl border-border bg-card">
          <CardHeader className="items-start px-6 pb-5 pt-7 sm:px-8 sm:pt-8">
            <div className="mb-7 flex items-center gap-3 lg:hidden">
              <BrandMark className="h-10 w-10 text-primary" />
              <span className="text-xl font-bold tracking-tight text-foreground">Bharoxa</span>
            </div>
            {inviteToken ? <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><UsersRound className="h-5 w-5 text-primary" /></div> : null}
            <CardTitle className="text-2xl tracking-tight text-foreground">{inviteToken ? t('titleAccept') : t('titleWelcome')}</CardTitle>
            <CardDescription className="mt-2 text-sm leading-6 text-muted-foreground">{inviteToken ? t('descAccept') : t('descWelcome')}</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-7 sm:px-8 sm:pb-8">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-muted-foreground">
                {t('emailLabel')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-muted-foreground">
                  {t('passwordLabel')}
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:text-primary/80"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? t('signingIn') : t('signIn')}
            </Button>
          </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('noAccount')}{" "}
            <Link
              href={
                inviteToken
                  ? `/signup?invite=${encodeURIComponent(inviteToken)}`
                  : "/signup"
              }
              className="text-primary hover:text-primary/80"
            >
              {t('createAccount')}
            </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
