"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  getNotifications,
  createNotification,
  getAudienceCount,
  cancelNotification,
  endTicker,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/services/adminNotificationService";
import { getProducts } from "@/services/admin/products";
import { getCategories } from "@/services/admin/categories";
import {
  AUTO_VARS,
  AUTO_VAR_SAMPLES,
  PERSONAL_IMAGE_SEGMENTS,
  extractVars,
  fillTpl,
  hasPlaceholders,
  hasAutoPlaceholders,
  hasNonAutoPlaceholders,
} from "@/lib/notificationTpl";
import { useConfirm } from "@/hooks/useConfirm";

export function useNotifications() {
  const [activeTab, setActiveTab] = useState("send");

  // Confirm dialog hook
  const { confirmState, requestConfirm, handleConfirm, handleCancel } = useConfirm();

  // ---------------- TEMPLATES LIST (Shared) ----------------
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState("");

  // ---------------- WIZARD STATE (Send Tab) ----------------
  const [step, setStep] = useState(1); // 1 | 2 | 3
  const [template, setTemplate] = useState(null); // null = Write your own
  const [vars, setVars] = useState({}); // { [varName]: value }
  const [titleTpl, setTitleTpl] = useState("");
  const [bodyTpl, setBodyTpl] = useState("");
  const [editText, setEditText] = useState(false);
  const [showMore, setShowMore] = useState(false);

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

  // Step 3 Audience, Channel & Timing
  const [audienceType, setAudienceTypeState] = useState("all"); // "all" | "segment"
  const [segment, setSegment] = useState("cart");
  const [audienceCategorySearch, setAudienceCategorySearch] = useState("");
  const [selectedAudienceCategory, setSelectedAudienceCategory] = useState(null);
  const [audienceCount, setAudienceCount] = useState(null);
  const [audienceCountLoading, setAudienceCountLoading] = useState(false);
  const [personalImage, setPersonalImage] = useState(true);

  const [channel, setChannel] = useState("both"); // "both" | "app" | "web"
  const [tickerDurationHours, setTickerDurationHours] = useState(24);
  const [sendMode, setSendMode] = useState("now"); // "now" | "schedule"
  const [scheduledAt, setScheduledAt] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");

  const categoryId = selectedAudienceCategory?._id || "";

  // ---------------- TEMPLATES TAB STATE ----------------
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [activeTemplateField, setActiveTemplateField] = useState("titleTpl");
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
  const historyReqSeqRef = useRef(0);

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
  const loadNotifications = useCallback(async (overrides = {}) => {
    const seq = ++historyReqSeqRef.current;
    if (!overrides.silent) {
      setNotificationsLoading(true);
    }
    setNotificationsError("");
    try {
      const page = overrides.page !== undefined ? overrides.page : historyPage;
      const status = overrides.status !== undefined ? overrides.status : historyStatusFilter;
      const params = {
        page,
        limit: 10,
      };
      if (status !== "all") {
        params.status = status;
      }
      const res = await getNotifications(params);
      if (seq === historyReqSeqRef.current) {
        setNotifications(res.data.notifications || []);
        setHistoryPagination({
          total: res.data.total || 0,
          page: res.data.page || 1,
          pages: res.data.pages || 1,
        });
      }
    } catch (err) {
      if (seq === historyReqSeqRef.current) {
        setNotificationsError(err.response?.data?.message || "Failed to load notifications history");
      }
    } finally {
      if (seq === historyReqSeqRef.current) {
        setNotificationsLoading(false);
      }
    }
  }, [historyPage, historyStatusFilter]);

  useEffect(() => {
    const timer = setTimeout(loadTemplates, 0);
    return () => clearTimeout(timer);
  }, [loadTemplates]);

  // Load notifications when entering history tab or when filter/page changes
  useEffect(() => {
    if (activeTab !== "history") return;

    const timer = setTimeout(() => {
      loadNotifications();
    }, 0);

    return () => clearTimeout(timer);
  }, [activeTab, loadNotifications]);

  // Check if any notifications are currently scheduled, sending, or live-ticker
  const hasActiveRows = useMemo(() => {
    return notifications.some(
      (n) => n.status === "scheduled" || n.status === "sending" || Boolean(n.isTickerLive)
    );
  }, [notifications]);

  // 5s silent polling for scheduled/sending rows while on history tab
  useEffect(() => {
    if (activeTab !== "history" || !hasActiveRows) return;

    const intervalId = setInterval(() => {
      loadNotifications({ silent: true });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [activeTab, hasActiveRows, loadNotifications]);

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

  // Category load effect when openScreen === "category" or segment === "category"
  useEffect(() => {
    const needsCategories =
      openScreen === "category" || (audienceType === "segment" && segment === "category");
    if (!needsCategories) return;
    let alive = true;
    if (allCategories.length === 0) {
      const timer = setTimeout(() => {
        setCategoryLoading(true);
        getCategories()
          .then((res) => {
            if (alive) setAllCategories(res.data.data || []);
          })
          .catch(() => {})
          .finally(() => {
            if (alive) setCategoryLoading(false);
          });
      }, 0);
      return () => {
        alive = false;
        clearTimeout(timer);
      };
    }
  }, [openScreen, audienceType, segment, allCategories.length]);

  const categoryResults = useMemo(() => {
    if (!categorySearch.trim()) return allCategories.slice(0, 10);
    const q = categorySearch.toLowerCase().trim();
    return allCategories.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 10);
  }, [allCategories, categorySearch]);

  const audienceCategoryResults = useMemo(() => {
    if (!audienceCategorySearch.trim()) return allCategories.slice(0, 10);
    const q = audienceCategorySearch.toLowerCase().trim();
    return allCategories.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 10);
  }, [allCategories, audienceCategorySearch]);

  const setAudienceType = (nextType) => {
    setAudienceTypeState(nextType);
    setAudienceCount(null);
    setSendError("");
    if (nextType === "segment") {
      setChannel("app");
    } else {
      setChannel(template?.channel || "both");
    }
  };

  const handleSegmentChange = (nextSegment) => {
    setSegment(nextSegment);
    setAudienceCount(null);
  };

  const handleSelectedAudienceCategoryChange = (nextCat) => {
    setSelectedAudienceCategory(nextCat);
    setAudienceCount(null);
  };

  // Debounced live audience count (400ms)
  useEffect(() => {
    if (step !== 3 || audienceType !== "segment" || !segment) {
      return;
    }
    if (segment === "category" && !categoryId) {
      return;
    }
    let alive = true;
    const timer = setTimeout(() => {
      setAudienceCountLoading(true);
      getAudienceCount({
        segment,
        ...(segment === "category" ? { categoryId } : {}),
      })
        .then((res) => {
          if (alive) setAudienceCount(res.data);
        })
        .catch(() => {
          if (alive) setAudienceCount(null);
        })
        .finally(() => {
          if (alive) setAudienceCountLoading(false);
        });
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [step, audienceType, segment, categoryId]);

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

  // Non-auto templates for the Send wizard
  const manualTemplates = useMemo(() => {
    return templates.filter((t) => !t.auto);
  }, [templates]);

  // Pick template in Step 1
  const pickTemplate = (t) => {
    setTemplate(t);
    setVars({});
    setTitleTpl(t ? t.titleTpl : "");
    setBodyTpl(t ? t.bodyTpl || "" : "");
    setChannel(audienceType === "segment" ? "app" : t ? t.channel || "both" : "both");
    setEditText(!t);
    setStep(2);
    setSendError("");
  };

  // Switch to editing text in Step 2
  const startEditText = () => {
    const currentTitle = fillTpl(titleTpl, vars, "strict");
    const currentBody = fillTpl(bodyTpl, vars, "strict");
    setTitleTpl(currentTitle);
    setBodyTpl(currentBody);
    setVars({});
    setEditText(true);
  };

  const handleVarChange = (varName, value) => {
    setVars((prev) => ({ ...prev, [varName]: value }));
  };

  // Variable names from current title/body templates (excluding auto-filled personal variables)
  const varNames = useMemo(() => {
    return extractVars(titleTpl, bodyTpl).filter((k) => !AUTO_VARS.includes(k));
  }, [titleTpl, bodyTpl]);

  // Final strings for sending & validation
  const finalTitle = useMemo(() => {
    return fillTpl(titleTpl, vars, "strict");
  }, [titleTpl, vars]);

  const finalBody = useMemo(() => {
    return fillTpl(bodyTpl, vars, "strict");
  }, [bodyTpl, vars]);

  // Preview strings (auto variables shown as sample values; manual unfilled variables shown as [Label])
  const previewTitle = useMemo(() => {
    return fillTpl(titleTpl, { ...AUTO_VAR_SAMPLES, ...vars }, "label");
  }, [titleTpl, vars]);

  const previewBody = useMemo(() => {
    return fillTpl(bodyTpl, { ...AUTO_VAR_SAMPLES, ...vars }, "label");
  }, [bodyTpl, vars]);

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
  const varsFilled = useMemo(() => {
    return varNames.every((k) => {
      if (!vars || !Object.prototype.hasOwnProperty.call(vars, k)) return false;
      const v = typeof vars[k] === "string" ? vars[k] : vars[k] != null ? String(vars[k]) : "";
      return v.trim().length > 0;
    });
  }, [varNames, vars]);

  const placeholdersRemaining = hasNonAutoPlaceholders(finalTitle, finalBody);
  const hasAutoPlaceholdersInMsg = hasAutoPlaceholders(finalTitle, finalBody);
  const isTitleEmpty = !finalTitle.trim();
  const isTitleTooLong = finalTitle.length > 65;
  const isBodyTooLong = finalBody.length > 240;
  const isImageUrlInvalid = Boolean(imageUrl.trim() && !/^https:\/\//i.test(imageUrl.trim()));
  const isScheduleInvalid =
    sendMode === "schedule" && (!scheduledAt || (minScheduledAt ? scheduledAt < minScheduledAt : false));
  const isScreenSelectionIncomplete =
    (openScreen === "product" && !selectedProduct?.slug) ||
    (openScreen === "category" && !selectedCategory?.slug);

  const canNext2 =
    varsFilled &&
    !isTitleEmpty &&
    !isTitleTooLong &&
    !isBodyTooLong &&
    !placeholdersRemaining &&
    !isImageUrlInvalid &&
    !isScreenSelectionIncomplete;

  const isAudienceInvalid =
    audienceType === "segment"
      ? (segment === "category" && !categoryId) ||
        audienceCountLoading ||
        !audienceCount ||
        audienceCount.withApp === 0
      : hasAutoPlaceholdersInMsg;

  const canSubmitSend = canNext2 && !isScheduleInvalid && !isAudienceInvalid;

  // ---------------- SEND SUBMISSION ----------------
  const submitSend = async () => {
    if (!canSubmitSend) return;
    setSendLoading(true);
    setSendError("");
    try {
      const isSegment = audienceType === "segment";
      const payload = {
        title: finalTitle.trim(),
        body: finalBody.trim(),
        type: template?.type || "custom",
        channel: isSegment ? "app" : channel,
        link: computedLink,
        imageUrl: imageUrl.trim(),
        tickerDurationHours: Number(tickerDurationHours) || 24,
        sendNow: sendMode === "now",
        scheduledAt: sendMode === "schedule" ? new Date(scheduledAt).toISOString() : undefined,
        audience: isSegment
          ? {
              type: "segment",
              segment,
              ...(segment === "category" ? { categoryId } : {}),
            }
          : { type: "all" },
        personalImage:
          isSegment && PERSONAL_IMAGE_SEGMENTS.includes(segment) ? personalImage : false,
      };

      await createNotification(payload);
      toast.success(sendMode === "now" ? "Notification sent successfully!" : "Notification scheduled successfully!");

      // Reset wizard to Step 1
      setStep(1);
      setTemplate(null);
      setVars({});
      setTitleTpl("");
      setBodyTpl("");
      setEditText(false);
      setShowMore(false);
      setImageUrl("");
      setOpenScreen("home");
      setSelectedProduct(null);
      setSelectedCategory(null);
      setCustomLink("");
      setAudienceTypeState("all");
      setSegment("cart");
      setAudienceCategorySearch("");
      setSelectedAudienceCategory(null);
      setAudienceCount(null);
      setPersonalImage(true);
      setChannel("both");
      setTickerDurationHours(24);
      setSendMode("now");
      setScheduledAt("");

      // Switch to History tab and reload
      setActiveTab("history");
      setHistoryPage(1);
      loadNotifications({ page: 1 });
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
    setActiveTemplateField("titleTpl");
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
    setActiveTemplateField("titleTpl");
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

  const insertVariableInTemplateForm = (varName) => {
    const placeholder = `{{${varName}}}`;
    setTemplateFormData((prev) => {
      const field = activeTemplateField === "bodyTpl" ? "bodyTpl" : "titleTpl";
      const currentVal = prev[field] || "";
      const separator = currentVal && !currentVal.endsWith(" ") ? " " : "";
      return {
        ...prev,
        [field]: `${currentVal}${separator}${placeholder}`,
      };
    });
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

  const toggleTemplateEnabled = async (tpl, enabled) => {
    setTemplates((prev) => prev.map((t) => (t._id === tpl._id ? { ...t, enabled } : t)));
    try {
      await updateTemplate(tpl._id, { enabled });
      toast.success(enabled ? `${tpl.name} enabled` : `${tpl.name} disabled`);
    } catch (err) {
      setTemplates((prev) =>
        prev.map((t) => (t._id === tpl._id ? { ...t, enabled: tpl.enabled } : t))
      );
      toast.error(err.response?.data?.message || "Failed to update template");
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
    setStep(2);
    setTemplate(null);
    setVars({});
    setTitleTpl(n.title || "");
    setBodyTpl(n.body || "");
    setEditText(true);
    setImageUrl(n.imageUrl || "");
    setShowMore(Boolean(n.imageUrl || (n.link && n.link !== "/")));
    setChannel(n.audience?.type === "segment" ? "app" : n.channel || "both");
    setAudienceTypeState(n.audience?.type === "segment" ? "segment" : "all");
    setSegment(n.audience?.segment || "cart");
    setPersonalImage(n.personalImage !== undefined ? Boolean(n.personalImage) : true);
    setSelectedAudienceCategory(null);
    setAudienceCategorySearch("");
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

    // Wizard / Send Tab
    step,
    setStep,
    template,
    manualTemplates,
    pickTemplate,
    vars,
    setVars,
    handleVarChange,
    titleTpl,
    setTitleTpl,
    bodyTpl,
    setBodyTpl,
    finalTitle,
    finalBody,
    previewTitle,
    previewBody,
    varNames,
    editText,
    setEditText,
    startEditText,
    showMore,
    setShowMore,
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
    audienceType,
    setAudienceType,
    segment,
    setSegment: handleSegmentChange,
    categoryId,
    audienceCategorySearch,
    setAudienceCategorySearch,
    audienceCategoryResults,
    selectedAudienceCategory,
    setSelectedAudienceCategory: handleSelectedAudienceCategoryChange,
    audienceCount,
    audienceCountLoading,
    personalImage,
    setPersonalImage,
    hasAutoPlaceholdersInMsg,
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
    canNext2,
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
    activeTemplateField,
    setActiveTemplateField,
    templateFormData,
    setTemplateFormData,
    insertVariableInTemplateForm,
    templateSubmitting,
    templateFormError,
    openCreateTemplateDialog,
    openEditTemplateDialog,
    closeTemplateDialog,
    submitTemplate,
    toggleTemplateEnabled,
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
