'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Router,
  Activity,
  CreditCard,
  Building2,
  Globe,
  Loader2,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Router,
    title: 'Universal Device Management',
    description: 'Mikrotik, Ubiquiti, Cisco, Juniper and more',
  },
  {
    icon: Activity,
    title: 'Real-time Usage Metering',
    description: 'Track bandwidth, data caps, and quotas live',
  },
  {
    icon: CreditCard,
    title: 'Pesapal Payment Gateway',
    description: 'M-Pesa, Airtel Money, Tigo Pesa, cards & banks',
  },
  {
    icon: Building2,
    title: 'Multi-tenant SaaS Architecture',
    description: 'Manage multiple ISPs from a single platform',
  },
];

export default function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    try {
      await login(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password. Please try again.';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-900 text-white flex-col justify-between p-8 xl:p-12 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 h-64 w-64 rounded-full bg-emerald-400 blur-3xl" />
          <div className="absolute bottom-20 right-10 h-80 w-80 rounded-full bg-emerald-500 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-emerald-300 blur-3xl" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                <span className="text-emerald-400">nekke</span>
                <span className="text-white">WiFi</span>
              </h1>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-lg">
          <h2 className="text-3xl xl:text-4xl font-bold mb-4 leading-tight">
            ISP Billing &{' '}
            <span className="text-emerald-400">Network Management</span>{' '}
            Platform
          </h2>
          <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
            Streamline your ISP operations with automated billing, real-time monitoring,
            and seamless payment integration.
          </p>

          <div className="space-y-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{feature.title}</p>
                    <p className="text-sm text-zinc-400 mt-0.5">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-sm text-zinc-500">
            nekkeWiFi v2.0 — Powered by nekke Technologies
          </p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-emerald-600">nekke</span>
              <span>WiFi</span>
            </h1>
          </div>

          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader className="text-center sm:text-left space-y-1 px-0 sm:px-6 pt-0 sm:pt-6">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Sign in to your account
              </CardTitle>
              <CardDescription>
                Enter your credentials to access the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 pb-0 sm:pb-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg p-3">
                    {error}
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-10"
                      autoComplete="current-password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={isLoading}
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-normal text-muted-foreground cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>

                {/* Sign In Button */}
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-11"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Demo Credentials Hint */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 sm:p-5">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-3">
              Demo Accounts (password: demo123)
            </p>
            <div className="space-y-2 text-sm">
              <button
                type="button"
                onClick={() => {
                  setEmail('super@nekkewifi.com');
                  setPassword('demo123');
                }}
                className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                <span className="h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-amber-900 dark:text-amber-300">
                  <span className="font-medium">Super Admin:</span>{' '}
                  super@nekkewifi.com
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('hassan@darnet.co.tz');
                  setPassword('demo123');
                }}
                className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-amber-900 dark:text-amber-300">
                  <span className="font-medium">Admin:</span>{' '}
                  hassan@darnet.co.tz
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('grace@darnet.co.tz');
                  setPassword('demo123');
                }}
                className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                <span className="h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="text-amber-900 dark:text-amber-300">
                  <span className="font-medium">Agent:</span>{' '}
                  grace@darnet.co.tz
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('juma.viewer@darnet.co.tz');
                  setPassword('demo123');
                }}
                className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                <span className="h-2 w-2 rounded-full bg-zinc-400 flex-shrink-0" />
                <span className="text-amber-900 dark:text-amber-300">
                  <span className="font-medium">Viewer:</span>{' '}
                  juma.viewer@darnet.co.tz
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
