'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Globe,
  Router,
  CreditCard,
  Activity,
  Shield,
  Users,
  Check,
  Menu,
  X,
  ArrowRight,
  Building2,
  Wifi,
  BarChart3,
} from 'lucide-react';

const features = [
  {
    icon: Router,
    title: 'Universal Device Management',
    description: 'Manage MikroTik, TP-Link, Huawei, ZTE, ONT/OLT, and more from a single dashboard with automated provisioning.',
  },
  {
    icon: CreditCard,
    title: 'Automated Billing',
    description: 'Auto-generate invoices, track payments, and manage subscriptions with flexible billing cycles.',
  },
  {
    icon: Activity,
    title: 'Real-time Monitoring',
    description: 'Monitor bandwidth, device health, and customer usage in real-time with instant alerts.',
  },
  {
    icon: CreditCard,
    title: 'Pesapal Payments',
    description: 'Accept M-PESA, Airtel Money, Tigo Pesa, and card payments seamlessly through Pesapal integration.',
  },
  {
    icon: Shield,
    title: 'Multi-tenant Architecture',
    description: 'Serve multiple ISP organizations from a single platform with full data isolation and RBAC.',
  },
  {
    icon: Users,
    title: 'Customer Self-Service Portal',
    description: 'Let customers check usage, view invoices, make payments, and manage their accounts online.',
  },
];

const plans = [
  {
    name: 'Basic',
    price: 'Free',
    period: 'forever',
    description: 'Perfect for small ISPs getting started',
    features: [
      'Up to 100 customers',
      '5 devices',
      'Basic billing',
      'Email support',
      'Customer portal',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$49',
    period: '/month',
    description: 'For growing ISPs that need more power',
    features: [
      'Up to 5,000 customers',
      '25 devices',
      'Advanced billing & invoicing',
      'Pesapal payments',
      'Priority support',
      'Analytics & reports',
      'Multi-user access',
    ],
    cta: 'Get Started',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large ISPs with advanced needs',
    features: [
      'Unlimited customers',
      'Unlimited devices',
      'White-label branding',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'On-premise option',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-xl">
                  <span className="text-emerald-600">nekke</span>
                  <span>WiFi</span>
                </span>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">Get Started</Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <div className="flex gap-2 pt-2">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full">Sign In</Button>
                </Link>
                <Link href="/signup" className="flex-1">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 dark:from-emerald-950/20 dark:via-zinc-950 dark:to-emerald-950/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium mb-6">
              <Wifi className="h-3.5 w-3.5" />
              Built for Tanzanian ISPs
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Manage Your ISP with{' '}
              <span className="text-emerald-600">nekkeWiFi</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The all-in-one billing and network management platform. Automate invoicing, monitor devices,
              accept mobile money payments, and delight your customers.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 text-base">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="px-8 text-base">
                  Learn More
                </Button>
              </a>
            </div>
            <div className="mt-10 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                Free plan available
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                No credit card required
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section id="features" className="py-20 sm:py-28 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything You Need to Run Your ISP
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From device management to automated billing, nekkeWiFi covers every aspect of your ISP operations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg transition-all duration-300"
                >
                  <div className="h-12 w-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Icon className="h-6 w-6 text-emerald-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── STATS SECTION ── */}
      <section className="py-16 bg-emerald-600 dark:bg-emerald-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center text-white">
            <div>
              <p className="text-3xl sm:text-4xl font-bold">50+</p>
              <p className="text-emerald-100 mt-1 text-sm">ISPs Powered</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold">10K+</p>
              <p className="text-emerald-100 mt-1 text-sm">Customers Managed</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold">99.9%</p>
              <p className="text-emerald-100 mt-1 text-sm">Uptime</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-bold">24/7</p>
              <p className="text-emerald-100 mt-1 text-sm">Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ── */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Choose the plan that fits your ISP. Upgrade or downgrade anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border-2 p-6 lg:p-8 flex flex-col ${
                  plan.highlighted
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xl scale-105'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                }`}
              >
                {plan.highlighted && (
                  <div className="inline-flex self-start items-center px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-semibold mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                <div className="mt-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground ml-1">{plan.period}</span>}
                </div>
                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="mt-8">
                  <Button
                    className={`w-full ${
                      plan.highlighted
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : ''
                    }`}
                    variant={plan.highlighted ? 'default' : 'outline'}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="py-20 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl px-8 py-16 sm:py-20 text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-bold">Ready to Streamline Your ISP?</h2>
            <p className="mt-4 text-emerald-100 text-lg max-w-2xl mx-auto">
              Join dozens of Tanzanian ISPs already using nekkeWiFi to manage their operations efficiently.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="bg-white text-emerald-700 hover:bg-zinc-100 px-8 text-base font-semibold">
                  Get Started Today
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="ghost" className="text-white hover:bg-emerald-800 px-8 text-base">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-xl">
                  <span className="text-emerald-600">nekke</span>
                  <span>WiFi</span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                nekkeWiFi is a comprehensive ISP billing and network management platform designed for
                Internet Service Providers in Tanzania. Built by nekke Technologies.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><Link href="/portal" className="hover:text-foreground transition-colors">Customer Portal</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span className="hover:text-foreground transition-colors cursor-default">About</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">Contact</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">Support</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} nekkeWiFi by nekke Technologies. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="hover:text-foreground transition-colors cursor-default">Privacy Policy</span>
              <span className="hover:text-foreground transition-colors cursor-default">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
