import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  BadgeIndianRupee,
  CheckCircle2,
  Clock,
  Eye,
  ImageUp,
  ClipboardList,
  Database,
  Layers,
  LayoutDashboard,
  QrCode,
  TicketPercent,
  Mail,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
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
  adminSavePlan,
  type AdminPlan,
  adminSetOrderStatus,
  adminUpdatePlanPrice,
  adminPaymentSettings,
  adminSavePaymentSettings,

} from "@/lib/admin.api";
import { previewAccessEmail, sendAccessEmail } from "@/lib/order-email.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";


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

const ADMIN_SECTIONS = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "orders", label: "Orders", icon: ClipboardList },
  { value: "prices", label: "Plan prices", icon: BadgeIndianRupee },
  { value: "plans", label: "Plans", icon: Layers },
  { value: "coupons", label: "Coupons", icon: TicketPercent },
  { value: "payment", label: "Payment", icon: QrCode },
  { value: "data", label: "Data", icon: Database },
] as const;

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

  const [activeSection, setActiveSection] = useState<(typeof ADMIN_SECTIONS)[number]["value"]>("overview");

  return (
    <SiteLayout>
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-[calc(100vh-4rem)] w-full">
          <AdminSidebar activeSection={activeSection} onSelect={setActiveSection} />

          <SidebarInset className="flex-1">
            <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="shrink-0" />
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin panel</p>
                    <h1 className="text-2xl font-extrabold sm:text-3xl">
                      Manage <span className="text-gradient">Telugu-Toon-World</span>
                    </h1>
                  </div>
                </div>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={async () => {
                    await signOut();
                    navigate({ to: "/auth", replace: true });
                  }}
                >
                  <LogOut className="size-4" /> Logout
                </Button>
              </div>

              <div className="mt-8">
                {activeSection === "overview" && <OverviewTab />}
                {activeSection === "orders" && <OrdersTab />}
                {activeSection === "prices" && <PricesTab />}
                {activeSection === "plans" && <PlansTab />}
                {activeSection === "coupons" && <CouponsTab />}
                {activeSection === "payment" && <PaymentTab />}
                {activeSection === "data" && <DataTab />}
              </div>
            </section>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </SiteLayout>
  );
}

function AdminSidebar({
  activeSection,
  onSelect,
}: {
  activeSection: (typeof ADMIN_SECTIONS)[number]["value"];
  onSelect: (value: (typeof ADMIN_SECTIONS)[number]["value"]) => void;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="p-4">
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-highlight text-primary-foreground font-display font-bold">
            T
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-display font-bold leading-tight">Telugu-Toon</p>
              <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Admin</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_SECTIONS.map(({ value, label, icon: Icon }) => (
                <SidebarMenuItem key={value}>
                  <SidebarMenuButton
                    isActive={activeSection === value}
                    onClick={() => onSelect(value)}
                    tooltip={label}
                    className="gap-3"
                  >
                    <Icon className="size-4" />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Back to site">
              <Link to="/">
                <LogOut className="size-4" />
                <span>Back to site</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
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
          const email = await sendAccessEmail({ data: { orderId: input.orderId } });
          if (email.status !== "sent") {
            toast.warning("Access unlocked, but the invite email was not delivered — try Resend email.");
          }
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

  const [preview, setPreview] = useState<{ to: string; subject: string; html: string } | null>(null);

  const previewMutation = useMutation({
    mutationFn: (input: { orderId: string }) => previewAccessEmail({ data: input }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setPreview({ to: result.to, subject: result.subject, html: result.html });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not render the email"),
  });

  const resendMutation = useMutation({
    mutationFn: (input: { orderId: string }) => sendAccessEmail({ data: { orderId: input.orderId, force: true } }),
    onSuccess: (result) => {
      if (result.status === "sent") toast.success("Invite email sent to the customer.");
      else if (result.status === "suppressed") toast.error("The customer's address is blocked by the mail provider.");
      else toast.error(result.message ?? "Could not send the email.");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not send the email"),
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

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invite email preview</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                To: {preview.to} · Subject: {preview.subject}
              </p>
              <iframe
                title="Invite email preview"
                srcDoc={preview.html}
                className="h-[60vh] w-full rounded-2xl border border-border bg-white"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
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

/** Full plan editor — every customer-visible detail of a plan. */
function PlansTab() {
  const queryClient = useQueryClient();
  const { data: plans, isLoading } = useQuery({ queryKey: ["admin-plans"], queryFn: () => adminPlans() });

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="glass rounded-3xl p-6">
        <h2 className="font-display text-lg font-bold">Plans</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit everything customers see: name, price, duration, description, features, the Telegram invite link and
          whether the plan is shown on the storefront.
        </p>
      </div>
      {(plans ?? []).map((plan) => (
        <PlanEditor key={plan.id} plan={plan} onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
          queryClient.invalidateQueries({ queryKey: ["plans"] });
        }} />
      ))}
    </div>
  );
}

function PlanEditor({ plan, onSaved }: { plan: AdminPlan; onSaved: () => void }) {
  const [form, setForm] = useState(() => ({
    name: plan.name,
    price: String(plan.price),
    durationDays: String(plan.duration_days),
    durationLabel: plan.duration_label ?? "",
    description: plan.description ?? "",
    features: (plan.features ?? []).join("\n"),
    telegramLink: plan.telegram_link ?? "",
    active: plan.active,
    recommended: plan.recommended,
    sortOrder: String(plan.sort_order ?? 0),
  }));

  const mutation = useMutation({
    mutationFn: () =>
      adminSavePlan({
        data: {
          id: plan.id,
          name: form.name,
          price: Number(form.price),
          durationDays: Number(form.durationDays),
          durationLabel: form.durationLabel,
          description: form.description,
          features: form.features.split("\n"),
          telegramLink: form.telegramLink,
          active: form.active,
          recommended: form.recommended,
          sortOrder: Number(form.sortOrder),
        },
      }),
    onSuccess: () => {
      toast.success(`${form.name || "Plan"} updated — the storefront now shows the new details.`);
      onSaved();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save this plan"),
  });

  const set = (key: keyof typeof form) => (value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="glass rounded-3xl p-6"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-base font-bold">{plan.name}</p>
        <p className="text-xs text-muted-foreground">Current price {inr(plan.price)}</p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`name-${plan.id}`}>Plan name</Label>
          <Input id={`name-${plan.id}`} value={form.name} onChange={(e) => set("name")(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`p-${plan.id}`}>Price (₹)</Label>
          <Input id={`p-${plan.id}`} type="number" min={1} step="1" value={form.price} onChange={(e) => set("price")(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`dl-${plan.id}`}>Duration label</Label>
          <Input id={`dl-${plan.id}`} value={form.durationLabel} placeholder="1 Month / Lifetime" onChange={(e) => set("durationLabel")(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`dd-${plan.id}`}>Duration in days</Label>
          <Input id={`dd-${plan.id}`} type="number" min={1} step="1" value={form.durationDays} onChange={(e) => set("durationDays")(e.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`desc-${plan.id}`}>Short description</Label>
          <Textarea id={`desc-${plan.id}`} rows={2} value={form.description} onChange={(e) => set("description")(e.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`f-${plan.id}`}>Features (one per line)</Label>
          <Textarea id={`f-${plan.id}`} rows={5} value={form.features} onChange={(e) => set("features")(e.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`tl-${plan.id}`}>Telegram invite link</Label>
          <Input id={`tl-${plan.id}`} value={form.telegramLink} placeholder="https://t.me/+..." onChange={(e) => set("telegramLink")(e.target.value)} />
          <p className="text-xs text-muted-foreground">Sent to customers automatically once you approve their payment.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`so-${plan.id}`}>Display order</Label>
          <Input id={`so-${plan.id}`} type="number" step="1" value={form.sortOrder} onChange={(e) => set("sortOrder")(e.target.value)} />
        </div>
        <div className="flex items-end gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.active} onCheckedChange={(v) => set("active")(v)} />
            Visible on store
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.recommended} onCheckedChange={(v) => set("recommended")(v)} />
            Most popular
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save plan"}
        </Button>
      </div>
    </form>
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

/** Edit the UPI ID, payee name and QR image shown on the checkout page. */
function PaymentTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "payment-settings"], queryFn: adminPaymentSettings });
  const [form, setForm] = useState({ upiId: "", payeeName: "", qrUrl: "" });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: () => adminSavePaymentSettings({ data: form }),
    onSuccess: () => {
      toast.success("Payment details updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "payment-settings"] });
      queryClient.invalidateQueries({ queryKey: ["payment-details"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="glass max-w-xl rounded-4xl p-6">
      <h2 className="font-display text-lg font-bold">Payment details</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        These appear on the checkout page and in UPI app deep links.
      </p>

      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pay-upi">UPI ID</Label>
          <Input
            id="pay-upi"
            value={form.upiId}
            onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pay-name">Payee name</Label>
          <Input
            id="pay-name"
            value={form.payeeName}
            onChange={(e) => setForm((f) => ({ ...f, payeeName: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pay-qr-file">QR code image</Label>
          <Input
            id="pay-qr-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
                toast.error("Upload a PNG, JPG or WEBP image.");
                return;
              }
              if (file.size > 400_000) {
                toast.error("Please upload an image smaller than 400 KB.");
                return;
              }
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(new Error("Could not read that file."));
                reader.readAsDataURL(file);
              }).catch(() => "");
              if (!dataUrl) {
                toast.error("Could not read that image.");
                return;
              }
              setForm((f) => ({ ...f, qrUrl: dataUrl }));
              toast.success("Image ready — press Save to publish it.");
            }}
          />
          <p className="text-xs text-muted-foreground">
            Upload your UPI QR screenshot (under 400 KB), or paste an image link below. Leave both empty to keep the
            built-in QR.
          </p>
          <Input
            id="pay-qr"
            placeholder="https://..."
            value={form.qrUrl.startsWith("data:") ? "" : form.qrUrl}
            onChange={(e) => setForm((f) => ({ ...f, qrUrl: e.target.value }))}
          />
        </div>

        {form.qrUrl ? (
          <div className="space-y-2">
            <img
              src={form.qrUrl}
              alt="Preview of the QR code customers will scan"
              className="w-40 rounded-3xl bg-card p-2"
            />
            <Button variant="glass" size="sm" onClick={() => setForm((f) => ({ ...f, qrUrl: "" }))}>
              <Trash2 className="size-4" /> Remove image
            </Button>
          </div>
        ) : null}

        <Button variant="hero" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? <Loader2 className="animate-spin" /> : <BadgeIndianRupee />} Save payment details
        </Button>
      </div>
    </div>
  );
}
