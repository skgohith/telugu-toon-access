import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  BadgeIndianRupee,
  CheckCircle2,
  Clock,
  ImageUp,
  Loader2,
  LogOut,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { dateOnly, dateTime, inr } from "@/lib/format";
import { myProfile } from "@/lib/store.api";
import {
  type AdminCoupon,
  adminClearData,
  adminCoupons,
  adminDeleteCoupon,
  adminOrders,
  adminOverview,
  adminPlans,
  adminProofUrl,
  adminSaveCoupon,
  adminSetOrderStatus,
  adminUpdatePlanPrice,

} from "@/lib/admin.api";
import { sendAccessEmail } from "@/lib/order-email.functions";


export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — Telugu-Toon-World" },
      { name: "description", content: "Verify UPI payments, manage coupons, plans and customers." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin Panel — Telugu-Toon-World" },
      { property: "og:description", content: "Internal admin dashboard." },
    ],
  }),
  component: AdminPage,
});

const CHART_COLORS = ["var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function AdminPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { redirect: "/admin" } });
  }, [loading, user, navigate]);

  const { data: me, isLoading } = useQuery({
    queryKey: ["me", user?.id],
    queryFn: () => myProfile(),
    enabled: Boolean(user),
  });

  if (loading || isLoading) {
    return (
      <SiteLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-highlight" />
        </div>
      </SiteLayout>
    );
  }

  if (me && !me.isAdmin) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <ShieldCheck className="mx-auto size-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-extrabold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">This area is restricted to the store administrator.</p>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin panel</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">
              Manage <span className="text-gradient">Telugu-Toon-World</span>
            </h1>
          </div>
          <Button
            variant="glass"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth", replace: true });
            }}
          >
            <LogOut className="size-4" /> Logout
          </Button>
        </div>

        <Tabs defaultValue="overview" className="mt-8">
          <TabsList className="glass flex w-full flex-wrap justify-start gap-1 rounded-full p-1">
            <TabsTrigger value="overview" className="rounded-full px-4">
              Overview
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-full px-4">
              Orders
            </TabsTrigger>
            <TabsTrigger value="prices" className="rounded-full px-4">
              Plan prices
            </TabsTrigger>
            <TabsTrigger value="coupons" className="rounded-full px-4">
              Coupons
            </TabsTrigger>
            <TabsTrigger value="data" className="rounded-full px-4">
              Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="orders" className="mt-6">
            <OrdersTab />
          </TabsContent>
          <TabsContent value="prices" className="mt-6">
            <PricesTab />
          </TabsContent>
          <TabsContent value="coupons" className="mt-6">
            <CouponsTab />
          </TabsContent>
          <TabsContent value="data" className="mt-6">
            <DataTab />
          </TabsContent>
        </Tabs>

      </section>
    </SiteLayout>
  );
}

function OverviewTab() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: () => adminOverview() });

  if (isLoading || !data) return <Spinner />;

  const cards = [
    { label: "Total revenue", value: inr(data.totals.revenue), icon: BadgeIndianRupee },
    { label: "Total orders", value: String(data.totals.orders), icon: ShieldCheck },
    { label: "Pending", value: String(data.totals.pending), icon: Clock },
    { label: "Completed", value: String(data.totals.completed), icon: CheckCircle2 },
    { label: "Rejected", value: String(data.totals.rejected), icon: XCircle },
    { label: "Customers", value: String(data.totals.customers), icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <div key={card.label} className="glass rounded-3xl p-5">
            <card.icon className="size-5 text-highlight" />
            <p className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-extrabold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold">Revenue by month</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.monthly}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 16,
                  }}
                />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-chart-1)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold">Order status</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.statusBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                  {data.statusBreakdown.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 16,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold">Plan popularity</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.planPopularity}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 16,
                  }}
                />
                <Bar dataKey="value" fill="var(--color-chart-2)" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <h2 className="font-display text-lg font-bold">Coupon usage</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.couponUsage}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 16,
                  }}
                />
                <Bar dataKey="value" fill="var(--color-chart-3)" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrdersTab() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"all" | "pending" | "completed" | "rejected">("pending");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", status, search],
    queryFn: () => adminOrders({ data: { status, search } }),
  });

  const statusMutation = useMutation({
    mutationFn: async (input: { orderId: string; status: "completed" | "rejected" }) => {
      await adminSetOrderStatus({ data: input });
      if (input.status === "completed") {
        try {
          await sendAccessEmail({ data: { orderId: input.orderId } });
        } catch {
          toast.warning("Access unlocked, but the invite email could not be sent.");
        }
      }
      return { ok: true as const };
    },
    onSuccess: (_res, input) => {
      toast.success(input.status === "completed" ? "Payment approved — access unlocked." : "Order rejected.");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },

    onError: (error) => toast.error(error instanceof Error ? error.message : "Update failed"),
  });

  const proofMutation = useMutation({
    mutationFn: (input: { orderId: string }) => adminProofUrl({ data: input }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not open the proof"),
  });

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex flex-wrap items-center gap-3">
        {(["pending", "completed", "rejected", "all"] as const).map((value) => (
          <Button
            key={value}
            variant={status === value ? "hero" : "glass"}
            size="sm"
            onClick={() => setStatus(value)}
            className="capitalize"
          >
            {value}
          </Button>
        ))}
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            maxLength={80}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ref, name, email, UTR"
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (data ?? []).length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No orders in this view.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {(data ?? []).map((order) => (
            <div key={order.id} className="rounded-3xl bg-muted/40 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display font-bold">{order.order_ref}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.customer_name} · {order.customer_email} · {order.customer_phone}
                  </p>
                  {(order.instagram_username || order.telegram_username) && (
                    <p className="text-xs text-muted-foreground">
                      {order.instagram_username ? `Instagram @${order.instagram_username}` : ""}
                      {order.instagram_username && order.telegram_username ? " · " : ""}
                      {order.telegram_username ? `Telegram @${order.telegram_username}` : ""}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-muted-foreground">
                    {order.plan_name} · {inr(order.final_amount)}
                    {order.coupon_code ? ` · coupon ${order.coupon_code}` : ""} · {dateTime(order.created_at)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-highlight">UTR: {order.utr ?? "not submitted"}</p>
                  {order.payment_status === "completed" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Invite email:{" "}
                      <span
                        className={
                          order.access_email_status === "sent"
                            ? "font-semibold text-success"
                            : order.access_email_status === "failed" || order.access_email_status === "suppressed"
                              ? "font-semibold text-destructive"
                              : "font-semibold text-highlight"
                        }
                      >
                        {order.access_email_status === "sent"
                          ? `sent${order.access_email_sent_at ? ` · ${dateTime(order.access_email_sent_at)}` : ""}`
                          : order.access_email_status === "not_sent"
                            ? "not sent yet"
                            : order.access_email_status}
                      </span>
                      {order.access_email_error ? ` · ${order.access_email_error}` : ""}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {order.proof_path && (
                      <Button
                        size="sm"
                        variant="glass"
                        onClick={() => proofMutation.mutate({ orderId: order.id })}
                        disabled={proofMutation.isPending}
                      >
                        <ImageUp /> View payment proof
                      </Button>
                    )}
                    {order.payment_status === "completed" && (
                      <>
                        <Button
                          size="sm"
                          variant="glass"
                          onClick={() => previewMutation.mutate({ orderId: order.id })}
                          disabled={previewMutation.isPending}
                        >
                          <Eye /> Preview email
                        </Button>
                        <Button
                          size="sm"
                          variant="glass"
                          onClick={() => resendMutation.mutate({ orderId: order.id })}
                          disabled={resendMutation.isPending}
                        >
                          {resendMutation.isPending ? <Loader2 className="animate-spin" /> : <Mail />} Resend email
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold capitalize text-muted-foreground">{order.payment_status}</span>
                  {order.payment_status !== "completed" && (
                    <Button
                      size="sm"
                      variant="success"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ orderId: order.id, status: "completed" })}
                    >
                      <CheckCircle2 /> Approve
                    </Button>
                  )}
                  {order.payment_status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ orderId: order.id, status: "rejected" })}
                    >
                      <XCircle /> Reject
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const emptyCoupon = {
  id: null as string | null,
  code: "",
  planId: "",
  discountType: "percent" as "percent" | "fixed",
  discountValue: 10,
  maxUses: "" as string,
  expiresAt: "",
  active: true,
};

function CouponsTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyCoupon);

  const { data: coupons, isLoading } = useQuery({ queryKey: ["admin-coupons"], queryFn: () => adminCoupons() });
  const { data: plans } = useQuery({ queryKey: ["admin-plans"], queryFn: () => adminPlans() });

  const saveMutation = useMutation({
    mutationFn: () =>
      adminSaveCoupon({
        data: {
          id: form.id,
          code: form.code,
          planId: form.planId,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          expiresAt: form.expiresAt ? form.expiresAt : null,
          active: form.active,
        },
      }),
    onSuccess: () => {
      toast.success("Coupon saved");
      setForm(emptyCoupon);
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save coupon"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteCoupon({ data: { id } }),
    onSuccess: () => {
      toast.success("Coupon deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not delete coupon"),
  });

  function edit(coupon: AdminCoupon) {
    setForm({
      id: coupon.id,
      code: coupon.code,
      planId: coupon.plan_id,
      discountType: coupon.discount_type,
      discountValue: Number(coupon.discount_value),
      maxUses: coupon.max_uses === null ? "" : String(coupon.max_uses),
      expiresAt: coupon.expires_at ? coupon.expires_at.slice(0, 10) : "",
      active: coupon.active,
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <form
        className="glass h-fit rounded-3xl p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.planId) {
            toast.error("Select the plan this coupon belongs to");
            return;
          }
          saveMutation.mutate();
        }}
      >
        <h2 className="font-display text-lg font-bold">{form.id ? "Edit coupon" : "Create coupon"}</h2>
        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              value={form.code}
              maxLength={40}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan">Applies to plan</Label>
            <select
              id="plan"
              value={form.planId}
              onChange={(e) => setForm({ ...form, planId: e.target.value })}
              className="h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground"
              required
            >
              <option value="">Select a plan</option>
              {(plans ?? []).map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Discount type</Label>
              <select
                id="type"
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as "percent" | "fixed" })}
                className="h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground"
              >
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed (₹)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Discount value</Label>
              <Input
                id="value"
                type="number"
                min={1}
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                required
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxUses">Max uses (optional)</Label>
              <Input
                id="maxUses"
                type="number"
                min={1}
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires">Expires on (optional)</Label>
              <Input
                id="expires"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
            <Label htmlFor="active">Active</Label>
            <Switch id="active" checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button type="submit" variant="hero" className="flex-1" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="animate-spin" /> : null} Save coupon
          </Button>
          {form.id && (
            <Button type="button" variant="glass" onClick={() => setForm(emptyCoupon)}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <div className="glass rounded-3xl p-6">
        <h2 className="font-display text-lg font-bold">All coupons</h2>
        {isLoading ? (
          <Spinner />
        ) : (coupons ?? []).length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No coupons yet.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {(coupons ?? []).map((coupon) => (
              <li key={coupon.id} className="rounded-3xl bg-muted/40 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display font-bold">
                      {coupon.code}{" "}
                      <span className="text-xs font-semibold text-highlight">
                        {coupon.discount_type === "percent" ? `${coupon.discount_value}% off` : `${inr(coupon.discount_value)} off`}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(plans ?? []).find((p) => p.id === coupon.plan_id)?.name ?? "Plan"} · used {coupon.used_count}
                      {coupon.max_uses ? `/${coupon.max_uses}` : ""} ·{" "}
                      {coupon.expires_at ? `expires ${dateOnly(coupon.expires_at)}` : "no expiry"} ·{" "}
                      {coupon.active ? "active" : "inactive"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="glass" onClick={() => edit(coupon)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(coupon.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Price-only editor — nothing else about a plan can be changed here. */
function PricesTab() {
  const queryClient = useQueryClient();
  const { data: plans, isLoading } = useQuery({ queryKey: ["admin-plans"], queryFn: () => adminPlans() });
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (input: { id: string; price: number }) => adminUpdatePlanPrice({ data: input }),
    onSuccess: (_res, input) => {
      toast.success("Price updated — the storefront now shows the new price.");
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[input.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update the price"),
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="glass max-w-3xl rounded-3xl p-6">
      <div className="flex items-start gap-3">
        <BadgeIndianRupee className="mt-1 size-5 text-highlight" />
        <div>
          <h2 className="font-display text-lg font-bold">Plan prices</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Change only the price customers pay. Plan names, durations and features stay as they are.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {(plans ?? []).map((plan) => {
          const draft = drafts[plan.id] ?? String(plan.price);
          const changed = Number(draft) !== Number(plan.price);
          return (
            <div
              key={plan.id}
              className="flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-muted/40 p-5"
            >
              <div>
                <p className="font-display font-bold">{plan.name}</p>
                <p className="text-xs text-muted-foreground">
                  {plan.duration_label} · current price {inr(plan.price)} · {plan.active ? "active" : "inactive"}
                </p>
              </div>
              <div className="flex items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`price-${plan.id}`}>New price (₹)</Label>
                  <Input
                    id={`price-${plan.id}`}
                    type="number"
                    min={1}
                    step="1"
                    className="w-32"
                    value={draft}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [plan.id]: e.target.value }))}
                  />
                </div>
                <Button
                  variant="hero"
                  disabled={!changed || mutation.isPending}
                  onClick={() => mutation.mutate({ id: plan.id, price: Number(draft) })}
                >
                  {mutation.isPending ? <Loader2 className="animate-spin" /> : null} Save price
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


const SCOPES = [
  { value: "pending", label: "Clear pending orders" },
  { value: "completed", label: "Clear completed orders" },
  { value: "rejected", label: "Clear rejected orders" },
  { value: "coupons", label: "Clear all coupons" },
  { value: "customers", label: "Clear customers & orders" },
  { value: "all", label: "Clear everything" },
] as const;

function DataTab() {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<(typeof SCOPES)[number]["value"]>("pending");
  const [confirmText, setConfirmText] = useState("");

  const mutation = useMutation({
    mutationFn: () => adminClearData({ data: { scope, confirmText: "DELETE" } }),
    onSuccess: (res) => {
      toast.success(`Cleared: ${res.cleared}`);
      setConfirmText("");
      queryClient.invalidateQueries();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not clear data"),
  });

  return (
    <div className="glass max-w-xl rounded-3xl p-6">
      <h2 className="font-display text-lg font-bold text-destructive">Danger zone</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Permanently delete records. Type DELETE to confirm — this cannot be undone.
      </p>
      <div className="mt-5 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="scope">What to clear</Label>
          <select
            id="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as typeof scope)}
            className="h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground"
          >
            {SCOPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Type DELETE</Label>
          <Input id="confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value.toUpperCase())} />
        </div>
        <Button
          variant="destructive"
          className="w-full"
          disabled={confirmText !== "DELETE" || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />} Clear data
        </Button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="size-6 animate-spin text-highlight" />
    </div>
  );
}
