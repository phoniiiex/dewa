"use client";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayout } from "@/app/dashboard/layout";
import { useData } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard, BarChart3, Package, ShoppingCart, Truck, Users, Building2,
  Factory, Gift, UserCog, Wallet, Settings, HelpCircle,
  BadgeCheck, FileText, Bot, Camera, LogOut, Shield, FlaskConical,
  ChevronsUpDown, Map, Stethoscope, Activity, Save, X, User,
  ChevronRight, RotateCcw,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuBadge,
  SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OreoAvatar } from "@/components/custom/OreoAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface NavItem { label: string; href: string; icon: React.ElementType; badge?: number; managerOnly?: boolean; }
interface NavSection { title: string; items: NavItem[]; }

// Edit Profile Dialog
function EditProfileDialog({
  open, onClose, initialName, initialPhone, initialAvatar, onSave,
}: {
  open: boolean; onClose: () => void;
  initialName: string; initialPhone: string; initialAvatar: string;
  onSave: (data: { name: string; phone: string; avatarUrl: string }) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setName(initialName); setPhone(initialPhone); setAvatar(initialAvatar); }
  }, [open, initialName, initialPhone, initialAvatar]);

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 200;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        setAvatar(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = ev.target!.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ name: name.trim(), phone: phone.trim(), avatarUrl: avatar });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>دەستکاری پرۆفایل</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex justify-center">
            <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
              <OreoAvatar src={avatar} name={name || "؟"} size={80} />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="size-5 text-white" />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
          </div>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-name">ناو</Label>
              <Input id="edit-name" value={name} onChange={e => setName(e.target.value)} placeholder="ناوت بنووسە" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-phone">ژمارەی مۆبایل</Label>
              <Input id="edit-phone" value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="07XX XXX XXXX" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              <X className="size-4 me-1.5" /> پاشگەزبوونەوە
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              <Save className="size-4 me-1.5" />
              {saving ? "پاشەکەوتکردن..." : "پاشەکەوتکردن"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Sidebar
export default function AppSidebar() {
  const pathname = usePathname();
  const { settings } = useData();
  const { logout, currentUser, updateCurrentUserProfile } = useLayout() as ReturnType<typeof useLayout> & { showToast?: (m: string) => void };
  const { state } = useSidebar();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const isIconMode = state === "collapsed";
  const isSectionOpen = (title: string) => {
    if (isIconMode) return true; // always open in icon mode so icons show
    return openSections[title] !== false; // default open
  };

  const isAdmin = currentUser?.role === "ADMIN";
  const isManager = currentUser?.role === "MANAGER";
  const isAdminOrManager = isAdmin || isManager;

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("client_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "PENDING");
      setPendingRequestsCount(count || 0);
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  const navSections: NavSection[] = [
    {
      title: "سەرەکی",
      items: [
        { label: "پێشانگا",        href: "/dashboard",           icon: LayoutDashboard },
        { label: "شیکاری",        href: "/dashboard/analytics", icon: BarChart3,      managerOnly: true },
        { label: "بەرهەمەکان",    href: "/dashboard/products",  icon: Package },
        { label: "داواکارییەکان", href: "/dashboard/orders",    icon: ShoppingCart },
        { label: "پسوولەکان",     href: "/dashboard/invoices",  icon: FileText },
        { label: "بۆنەس",         href: "/dashboard/bonus",     icon: Gift,           managerOnly: true },
        { label: "نموونەکان",    href: "/dashboard/samples",  icon: FlaskConical },
        { label: "گەڕاوەکان",    href: "/dashboard/returns",  icon: RotateCcw },
      ],
    },
    {
      title: "بەڕێوەبردن",
      items: [
        { label: "کڕیارەکان",       href: "/dashboard/clients",    icon: Users,      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined },
        { label: "نوێنەری پزیشکی", href: "/dashboard/reps",       icon: UserCog,    managerOnly: true },
        { label: "کۆگاکان",         href: "/dashboard/warehouses", icon: Building2,  managerOnly: true },
        { label: "دابینکەرەکان",    href: "/dashboard/suppliers",  icon: Factory,    managerOnly: true },
        { label: "گواستنەوە",       href: "/dashboard/logistics",  icon: Truck },
        { label: "شوفێرەکان",      href: "/dashboard/drivers",    icon: BadgeCheck, managerOnly: true },
        { label: "پزیشکەکان",      href: "/dashboard/doctors",    icon: Stethoscope },
        { label: "نەخشەی زیندوو",  href: "/dashboard/map",        icon: Map },
        { label: "بۆت",            href: "/dashboard/telegram",   icon: Bot,        managerOnly: true },
      ],
    },
    {
      title: "کۆمپانیا",
      items: [
        { label: "دارایی",        href: "/dashboard/finance",    icon: Wallet,   managerOnly: true },
        { label: "چالاکییەکان",  href: "/dashboard/activities", icon: Activity, managerOnly: true },
        { label: "بەکارهێنەران", href: "/dashboard/users",      icon: Shield,   managerOnly: true },
      ],
    },
  ];

  const filteredSections = navSections
    .map(s => ({ ...s, items: s.items.filter(i => !i.managerOnly || isAdminOrManager) }))
    .filter(s => s.items.length > 0);

  const avatar = currentUser?.avatarUrl || "";
  const initials = currentUser?.name
    ? currentUser.name.split(" ").map(w => w[0]).join("").slice(0, 2)
    : "؟";
  const roleBadge = isAdmin ? "بەڕێوەبەر" : isManager ? "مامناوەند" : "نوێنەر";
  const roleBadgeColor = isAdmin
    ? "bg-primary/15 text-primary"
    : isManager
      ? "bg-blue-500/15 text-blue-600"
      : "bg-green-500/15 text-green-600";

  return (
    <>
      <Sidebar side="right" collapsible="icon" dir="rtl">

        {/* Header — Company / Team Switcher */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
                    />
                  }
                >
                  {settings.logo ? (
                    <img src={settings.logo} alt="logo" className="size-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-black text-sm shrink-0">
                      د
                    </div>
                  )}
                  <div className="grid flex-1 text-right text-sm leading-tight">
                    <span className="truncate font-semibold">{settings.name || "دەوا"}</span>
                    <span className="truncate text-xs text-muted-foreground">دەرمانسازی و فرۆشتن</span>
                  </div>
                  <ChevronsUpDown className="ms-auto size-4 shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  align="start"
                  side="bottom"
                  sideOffset={4}
                >
                  <DropdownMenuItem className="gap-2 p-2">
                    {settings.logo ? (
                      <img src={settings.logo} alt="logo" className="size-6 rounded object-cover shrink-0" />
                    ) : (
                      <div className="flex size-6 items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold shrink-0">
                        د
                      </div>
                    )}
                    <span className="font-medium">{settings.name || "دەوا"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Nav — Collapsible Sections */}
        <SidebarContent>
          {filteredSections.map(section => (
            <Collapsible
              key={section.title}
              open={isSectionOpen(section.title)}
              onOpenChange={open => setOpenSections(prev => ({ ...prev, [section.title]: open }))}
              className="group/collapsible"
            >
              <SidebarGroup>
                <SidebarGroupLabel
                  render={<CollapsibleTrigger />}
                  className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md transition-colors cursor-pointer group-data-[collapsible=icon]:hidden"
                >
                  {section.title}
                  <ChevronRight className="ms-auto size-3.5 transition-transform duration-200 group-data-[open]/collapsible:rotate-90" />
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.map(item => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href ||
                          (item.href !== "/dashboard" && pathname.startsWith(item.href));
                        return (
                          <SidebarMenuItem key={item.href}>
                            <SidebarMenuButton
                              render={<Link href={item.href} id={`nav-${item.href.split("/").pop()}`} />}
                              isActive={isActive}
                              tooltip={item.label}
                            >
                              <Icon className="size-4 shrink-0" />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                            {item.badge && (
                              <SidebarMenuBadge className="bg-destructive text-destructive-foreground text-[10px]">
                                {item.badge > 99 ? "99+" : item.badge}
                              </SidebarMenuBadge>
                            )}
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          ))}

          {/* Utility links pinned to bottom */}
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                {isAdminOrManager && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      render={<Link href="/dashboard/settings" />}
                      isActive={pathname === "/dashboard/settings"}
                      tooltip="ڕێکخستنەکان"
                    >
                      <Settings className="size-4" />
                      <span>ڕێکخستنەکان</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="#" />} tooltip="یارمەتی">
                    <HelpCircle className="size-4" />
                    <span>یارمەتی</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer — User Dropdown */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
                    />
                  }
                >
                  <OreoAvatar src={avatar} name={currentUser?.name || "بەکارهێنەر"} size={32} className="rounded-lg" />
                  <div className="grid flex-1 text-right text-sm leading-tight min-w-0">
                    <span className="truncate font-semibold">{currentUser?.name || "بەکارهێنەر"}</span>
                    <span className="truncate text-xs text-muted-foreground">{currentUser?.email}</span>
                  </div>
                  <ChevronsUpDown className="ms-auto size-4 shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="min-w-56 rounded-lg"
                  side="top"
                  align="end"
                  sideOffset={4}
                >
                  <div className="flex items-center gap-2 px-2 py-2 text-right text-sm">
                    <OreoAvatar src={avatar} name={currentUser?.name || "بەکارهێنەر"} size={32} className="rounded-lg" />
                    <div className="grid flex-1 text-right leading-tight min-w-0">
                      <span className="truncate font-semibold text-sm">{currentUser?.name || "بەکارهێنەر"}</span>
                      <span className="truncate text-xs text-muted-foreground">{currentUser?.email}</span>
                    </div>
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0", roleBadgeColor)}>
                      {roleBadge}
                    </span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => setEditProfileOpen(true)}>
                      <User className="size-4" />
                      دەستکاری پرۆفایل
                    </DropdownMenuItem>
                    {isAdminOrManager && (
                      <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
                        <Settings className="size-4" />
                        ڕێکخستنەکان
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onClick={logout}
                    >
                      <LogOut className="size-4" />
                      چوونەدەرەوە
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <EditProfileDialog
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        initialName={currentUser?.name || ""}
        initialPhone={currentUser?.phone || ""}
        initialAvatar={avatar}
        onSave={updateCurrentUserProfile}
      />
    </>
  );
}
