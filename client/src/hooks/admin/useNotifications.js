"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  getNotifications,
  createNotification,
  cancelNotification,
  endTicker,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/services/adminNotificationService";
import { getProducts } from "@/services/admin/products";
import { getCategories } from "@/services/admin/categories";
import { extractVars, fillTpl, hasPlaceholders } from "@/lib/notificationTpl";
import { useConfirm } from "@/hooks/useConfirm";

export function useNotifications() {
  const [activeTab, setActiveTab] = useState("send");

  // Confirm dialog hook
  const { confirmState, requestConfirm, handleConfirm, handleCancel } = useConfirm();

  // ---------------- SEND FORM STATE ----------------
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState("");

  const [selectedTemplateId, setSelectedTemplateId] = useState("custom");
  const [templateVars, setTemplateVars] = useState({});
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Open Screen & Destination Link State
  const [openScreen, setOpenScreen] = useState("home"); // "home" | "product" | "category" | "orders" | "custom"
  const [customLink, setCustomLink] = useState("");

  // Product picker state
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null); // { _id, name, slug }

  // Category picker state
  const [categorySearch, setCategorySearch] = useState("");
  const [allCategories, setAllCategories] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null); // { _id, name, slug }

  const [channel, setChannel] = useState("both"); // "both" | "app" | "web"
  const [tickerDurationHours, setTickerDurationHours] = useState(24);
  const [sendMode, setSendMode] = useState("now"); // "now" | "schedule"
  const [scheduledAt, setScheduledAt] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");

  // ---------------- TEMPLATES TAB STATE ----------------
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: "",
    type: "custom",
    channel: "both",
    titleTpl: "",
    bodyTpl: "",
  });
  const [templateSubmitting, setTemplateSubmitting] = useState(false);
  const [templateFormError, setTemplateFormError] = useState("");

  // ---------------- HISTORY TAB STATE ----------------
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState({ total: 0, page: 1, pages: 1 });

  // ---------------- FETCH TEMPLATES ----------------
  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError("");
    try {
      const res = await getTemplates();
      setTemplates(res.data.templates || []);
    } catch (err) {
      setTemplatesError(err.response?.data?.message || "Failed to load templates");
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  // ---------------- FETCH NOTIFICATIONS ----------------
  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError("");
    try {
      const params = {
        page: historyPage,
        limit: 10,
      };
      if (historyStatusFilter !== "all") {
        params.status = historyStatusFilter;
      }
      const res = await getNotifications(params);
      setNotifications(res.data.notifications || []);
      setHistoryPagination({
        total: res.data.total || 0,
        page: res.data.page || 1,
        pages: res.data.pages || 1,
      });
    } catch (err) {
      setNotificationsError(err.response?.data?.message || "Failed to load notifications history");
    } finally {
      setNotificationsLoading(false);
    }
  }, [historyPage, historyStatusFilter]);

  useEffect(() => {
    const timer = setTimeout(loadTemplates, 0);
    return () => clearTimeout(timer);
  }, [loadTemplates]);

  useEffect(() => {
    const timer = setTimeout(loadNotifications, 0);
    return () => clearTimeout(timer);
  }, [loadNotifications]);

  // Product search effect when openScreen === "product"
  useEffect(() => {
    if (openScreen !== "product") return;
    let alive = true;
    const timer = setTimeout(() => {
      setProductLoading(true);
      getProducts({ search: productSearch || undefined, limit: 10, page: 1 })
        .then((res) => {
          if (alive) setProductResults(res.data.data || []);
        })
        .catch(() => {})
        .finally(() => {
          if (alive) setProductLoading(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [openScreen, productSearch]);

  // Category load effect when openScreen === "category"
  useEffect(() => {
    if (openScreen !== "category") return;
    let alive = true;
    if (allCategories.length === 0) {
      setCategoryLoading(true);
      getCategories()
        .then((res) => {
          if (alive) setAllCategories(res.data.data || []);
        })
        .catch(() => {})
        .finally(() => {
          if (alive) setCategoryLoading(false);
        });
    }
  }, [openScreen, allCategories.length]);

  const categoryResults = useMemo(() => {
    if (!categorySearch.trim()) return allCategories.slice(0, 10);
    const q = categorySearch.toLowerCase().trim();
    return allCategories.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 10);
  }, [allCategories, categorySearch]);

  // Derived Link String
  const computedLink = useMemo(() => {
    switch (openScreen) {
      case "home":
        return "/";
      case "product":
        return selectedProduct?.slug ? `/product/${selectedProduct.slug}` : "";
      case "category":
        return selectedCategory?.slug ? `/category/${selectedCategory.slug}` : "";
      case "orders":
        return "/orders";
      case "custom":
        return customLink.trim();
      default:
        return "/";
    }
  }, [openScreen, selectedProduct, selectedCategory, customLink]);

  // Non-auto templates for the Send tab
  const manualTemplates = useMemo(() => {
    return templates.filter((t) => !t.auto);
  }, [templates]);

  // Selected template object
  const currentTemplate = useMemo(() => {
    return manualTemplates.find((t) => t._id === selectedTemplateId) || null;
  }, [manualTemplates, selectedTemplateId]);

  // Extracted variables from the current template
  const currentTemplateVarsList = useMemo(() => {
    if (!currentTemplate) return [];
    return extractVars(currentTemplate.titleTpl, currentTemplate.bodyTpl);
  }, [currentTemplate]);

  // Template select handler in Send tab
  const handleSelectTemplate = (id) => {
    setSelectedTemplateId(id);
    setSendError("");
    if (id === "custom") {
      setTemplateVars({});
      return;
    }
    const tpl = manualTemplates.find((t) => t._id === id);
    if (!tpl) return;

    const vars = extractVars(tpl.titleTpl, tpl.bodyTpl);
    const initialVars = {};
    vars.forEach((v) => {
      initialVars[v] = "";
    });
    setTemplateVars(initialVars);
    setTitle(tpl.titleTpl);
    setBody(tpl.bodyTpl || "");
    setChannel(tpl.channel || "both");
  };

  // Variable input change handler in Send tab
  const handleVarChange = (varName, value) => {
    const updatedVars = { ...templateVars, [varName]: value };
    setTemplateVars(updatedVars);
    if (currentTemplate) {
      setTitle(fillTpl(currentTemplate.titleTpl, updatedVars));
      setBody(fillTpl(currentTemplate.bodyTpl || "", updatedVars));
    }
  };

  // Min datetime-local string (now + 1 min), initialized via effect
  const [minScheduledAt, setMinScheduledAt] = useState("");
  useEffect(() => {
    const d = new Date(Date.now() + 60000);
    const pad = (n) => String(n).padStart(2, "0");
    const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const timer = setTimeout(() => setMinScheduledAt(formatted), 0);
    return () => clearTimeout(timer);
  }, []);

  // Validation
  const placeholdersRemaining = hasPlaceholders(title, body);
  const isTitleEmpty = !title.trim();
  const isTitleTooLong = title.length > 65;
  const isBodyTooLong = body.length > 240;
  const isImageUrlInvalid = Boolean(imageUrl.trim() && !/^https:\/\//i.test(imageUrl.trim()));
  const isScheduleInvalid =
    sendMode === "schedule" && (!scheduledAt || (minScheduledAt ? scheduledAt < minScheduledAt : false));
  const isScreenSelectionIncomplete =
    (openScreen === "product" && !selectedProduct?.slug) ||
    (openScreen === "category" && !selectedCategory?.slug);

  const canSubmitSend =
    !isTitleEmpty &&
    !isTitleTooLong &&
    !isBodyTooLong &&
    !placeholdersRemaining &&
    !isImageUrlInvalid &&
    !isScheduleInvalid &&
    !isScreenSelectionIncomplete;

  // ---------------- SEND SUBMISSION ----------------
  const submitSend = async () => {
    if (!canSubmitSend) return;
    setSendLoading(true);
    setSendError("");
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        type: currentTemplate?.type || "custom",
        channel,
        link: computedLink,
        imageUrl: imageUrl.trim(),
        tickerDurationHours: Number(tickerDurationHours) || 24,
        sendNow: sendMode === "now",
        scheduledAt: sendMode === "schedule" ? new Date(scheduledAt).toISOString() : undefined,
      };

      await createNotification(payload);
      toast.success(sendMode === "now" ? "Notification sent successfully!" : "Notification scheduled successfully!");

      // Reset form
      setSelectedTemplateId("custom");
      setTemplateVars({});
      setTitle("");
      setBody("");
      setImageUrl("");
      setOpenScreen("home");
      setSelectedProduct(null);
      setSelectedCategory(null);
      setCustomLink("");
      setChannel("both");
      setTickerDurationHours(24);
      setSendMode("now");
      setScheduledAt("");

      // Switch to History tab and reload
      setActiveTab("history");
      setHistoryPage(1);
      loadNotifications();
    } catch (err) {
      setSendError(err.response?.data?.message || "Failed to process notification");
      toast.error(err.response?.data?.message || "Failed to process notification");
    } finally {
      setSendLoading(false);
    }
  };

  // ---------------- TEMPLATE CRUD ----------------
  const openCreateTemplateDialog = () => {
    setEditingTemplate(null);
    setTemplateFormData({
      name: "",
      type: "custom",
      channel: "both",
      titleTpl: "",
      bodyTpl: "",
    });
    setTemplateFormError("");
    setTemplateDialogOpen(true);
  };

  const openEditTemplateDialog = (tpl) => {
    setEditingTemplate(tpl);
    setTemplateFormData({
      name: tpl.name,
      type: tpl.type || "custom",
      channel: tpl.channel || "both",
      titleTpl: tpl.titleTpl,
      bodyTpl: tpl.bodyTpl || "",
    });
    setTemplateFormError("");
    setTemplateDialogOpen(true);
  };

  const closeTemplateDialog = () => {
    setTemplateDialogOpen(false);
    setEditingTemplate(null);
    setTemplateFormError("");
  };

  const submitTemplate = async () => {
    if (!templateFormData.name.trim() || !templateFormData.titleTpl.trim()) {
      setTemplateFormError("Name and Title Template are required");
      return;
    }
    setTemplateSubmitting(true);
    setTemplateFormError("");
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate._id, templateFormData);
        toast.success("Template updated successfully");
      } else {
        await createTemplate(templateFormData);
        toast.success("Template created successfully");
      }
      closeTemplateDialog();
      loadTemplates();
    } catch (err) {
      setTemplateFormError(err.response?.data?.message || "Failed to save template");
      toast.error(err.response?.data?.message || "Failed to save template");
    } finally {
      setTemplateSubmitting(false);
    }
  };

  const removeTemplate = (tpl) => {
    if (tpl.isSystem) return;
    requestConfirm({
      title: "Delete template?",
      description: `This will permanently delete the "${tpl.name}" template.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteTemplate(tpl._id);
          toast.success("Template deleted");
          loadTemplates();
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to delete template");
        }
      },
    });
  };

  // ---------------- HISTORY ACTIONS ----------------
  const cancelScheduledNotification = (n) => {
    requestConfirm({
      title: "Cancel scheduled notification?",
      description: `Are you sure you want to cancel "${n.title}"?`,
      confirmLabel: "Cancel Notification",
      destructive: true,
      onConfirm: async () => {
        try {
          await cancelNotification(n._id);
          toast.success("Notification cancelled");
          loadNotifications();
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to cancel notification");
        }
      },
    });
  };

  const endTickerNotification = (n) => {
    requestConfirm({
      title: "End website ticker bar?",
      description: `This will immediately remove "${n.title}" from the storefront ticker.`,
      confirmLabel: "End Ticker",
      destructive: false,
      onConfirm: async () => {
        try {
          await endTicker(n._id);
          toast.success("Website ticker bar ended");
          loadNotifications();
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to end ticker");
        }
      },
    });
  };

  const reuseNotification = (n) => {
    setSelectedTemplateId("custom");
    setTemplateVars({});
    setTitle(n.title || "");
    setBody(n.body || "");
    setImageUrl(n.imageUrl || "");
    setChannel(n.channel || "both");
    setTickerDurationHours(n.tickerDurationHours || 24);
    setSendMode("now");
    setScheduledAt("");

    // Derive Open screen selection from link prefix
    const rawLink = n.link || "";
    if (!rawLink || rawLink === "/") {
      setOpenScreen("home");
      setSelectedProduct(null);
      setSelectedCategory(null);
      setCustomLink("");
    } else if (/^\/products?\//.test(rawLink)) {
      setOpenScreen("product");
      const slug = rawLink.replace(/^\/products?\//, "");
      setSelectedProduct({ _id: "", name: slug, slug });
      setSelectedCategory(null);
      setCustomLink("");
    } else if (/^\/category\//.test(rawLink)) {
      setOpenScreen("category");
      const slug = rawLink.replace(/^\/category\//, "");
      setSelectedCategory({ _id: "", name: slug, slug });
      setSelectedProduct(null);
      setCustomLink("");
    } else if (rawLink === "/orders" || rawLink === "/order" || rawLink === "/account/orders") {
      setOpenScreen("orders");
      setSelectedProduct(null);
      setSelectedCategory(null);
      setCustomLink("");
    } else {
      setOpenScreen("custom");
      setSelectedProduct(null);
      setSelectedCategory(null);
      setCustomLink(rawLink);
    }

    setActiveTab("send");
    toast.info("Notification details copied to Send tab");
  };

  return {
    // Tabs
    activeTab,
    setActiveTab,

    // Confirm dialog
    confirmState,
    handleConfirm,
    handleCancel,

    // Send Tab
    manualTemplates,
    selectedTemplateId,
    handleSelectTemplate,
    currentTemplate,
    currentTemplateVarsList,
    templateVars,
    handleVarChange,
    title,
    setTitle,
    body,
    setBody,
    imageUrl,
    setImageUrl,
    openScreen,
    setOpenScreen,
    customLink,
    setCustomLink,
    productSearch,
    setProductSearch,
    productResults,
    productLoading,
    selectedProduct,
    setSelectedProduct,
    categorySearch,
    setCategorySearch,
    categoryResults,
    categoryLoading,
    selectedCategory,
    setSelectedCategory,
    computedLink,
    channel,
    setChannel,
    tickerDurationHours,
    setTickerDurationHours,
    sendMode,
    setSendMode,
    scheduledAt,
    setScheduledAt,
    minScheduledAt,
    placeholdersRemaining,
    isTitleEmpty,
    isTitleTooLong,
    isBodyTooLong,
    isImageUrlInvalid,
    isScheduleInvalid,
    isScreenSelectionIncomplete,
    canSubmitSend,
    sendLoading,
    sendError,
    submitSend,

    // Templates Tab
    templates,
    templatesLoading,
    templatesError,
    templateDialogOpen,
    setTemplateDialogOpen,
    editingTemplate,
    templateFormData,
    setTemplateFormData,
    templateSubmitting,
    templateFormError,
    openCreateTemplateDialog,
    openEditTemplateDialog,
    closeTemplateDialog,
    submitTemplate,
    removeTemplate,

    // History Tab
    notifications,
    notificationsLoading,
    notificationsError,
    historyStatusFilter,
    setHistoryStatusFilter,
    historyPage,
    setHistoryPage,
    historyPagination,
    loadNotifications,
    cancelScheduledNotification,
    endTickerNotification,
    reuseNotification,
  };
}
