"use client";

import { SendStep1Template } from "./SendStep1Template";
import { SendStep2Message } from "./SendStep2Message";
import { SendStep3Delivery } from "./SendStep3Delivery";
import { NotificationPreviewCard } from "./NotificationPreviewCard";
import { PERSONAL_IMAGE_SEGMENTS } from "@/lib/notificationTpl";
import { cn } from "@/lib/utils";

export function SendTab({ notif }) {
  const {
    step,
    setStep,
    template,
    manualTemplates,
    pickTemplate,
    vars,
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
    audienceType,
    setAudienceType,
    segment,
    setSegment,
    categoryId,
    audienceCategorySearch,
    setAudienceCategorySearch,
    audienceCategoryResults,
    selectedAudienceCategory,
    setSelectedAudienceCategory,
    audienceCount,
    audienceCountLoading,
    audienceCountError,
    retryAudienceCount,
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
    isTitleTooLong,
    isBodyTooLong,
    isImageUrlInvalid,
    canNext2,
    canSubmitSend,
    sendLoading,
    sendError,
    submitSend,
    templatesLoading,
    templatesError,
  } = notif;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
      <div className="max-w-[720px] w-full space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground pb-2 border-b">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={cn(
              "cursor-pointer transition-colors",
              step === 1 ? "text-primary font-semibold" : step > 1 ? "text-foreground hover:text-primary" : ""
            )}
          >
            1 Template
          </button>
          <span className="text-muted-foreground/40">›</span>
          <button
            type="button"
            onClick={() => {
              if (step > 2) setStep(2);
            }}
            disabled={step <= 2}
            className={cn(
              step > 2 && "cursor-pointer hover:text-primary",
              step === 2 ? "text-primary font-semibold" : step > 2 ? "text-foreground" : ""
            )}
          >
            2 Message
          </button>
          <span className="text-muted-foreground/40">›</span>
          <span className={cn(step === 3 ? "text-primary font-semibold" : "")}>
            3 Send
          </span>
        </div>

        {/* STEP 1: PICK A TEMPLATE */}
        {step === 1 && (
          <SendStep1Template
            templatesLoading={templatesLoading}
            templatesError={templatesError}
            manualTemplates={manualTemplates}
            pickTemplate={pickTemplate}
          />
        )}

        {/* STEP 2: MESSAGE */}
        {step === 2 && (
          <SendStep2Message
            template={template}
            varNames={varNames}
            editText={editText}
            vars={vars}
            handleVarChange={handleVarChange}
            startEditText={startEditText}
            finalTitle={finalTitle}
            finalBody={finalBody}
            titleTpl={titleTpl}
            setTitleTpl={setTitleTpl}
            bodyTpl={bodyTpl}
            setBodyTpl={setBodyTpl}
            isTitleTooLong={isTitleTooLong}
            isBodyTooLong={isBodyTooLong}
            showMore={showMore}
            setShowMore={setShowMore}
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
            isImageUrlInvalid={isImageUrlInvalid}
            openScreen={openScreen}
            setOpenScreen={setOpenScreen}
            productSearch={productSearch}
            setProductSearch={setProductSearch}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
            productLoading={productLoading}
            productResults={productResults}
            categorySearch={categorySearch}
            setCategorySearch={setCategorySearch}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            categoryLoading={categoryLoading}
            categoryResults={categoryResults}
            customLink={customLink}
            setCustomLink={setCustomLink}
            setStep={setStep}
            canNext2={canNext2}
          />
        )}

        {/* STEP 3: SEND */}
        {step === 3 && (
          <SendStep3Delivery
            sendError={sendError}
            audienceType={audienceType}
            setAudienceType={setAudienceType}
            segment={segment}
            setSegment={setSegment}
            categoryId={categoryId}
            audienceCategorySearch={audienceCategorySearch}
            setAudienceCategorySearch={setAudienceCategorySearch}
            audienceCategoryResults={audienceCategoryResults}
            selectedAudienceCategory={selectedAudienceCategory}
            setSelectedAudienceCategory={setSelectedAudienceCategory}
            categoryLoading={categoryLoading}
            audienceCount={audienceCount}
            audienceCountLoading={audienceCountLoading}
            audienceCountError={audienceCountError}
            retryAudienceCount={retryAudienceCount}
            personalImage={personalImage}
            setPersonalImage={setPersonalImage}
            hasAutoPlaceholdersInMsg={hasAutoPlaceholdersInMsg}
            channel={channel}
            setChannel={setChannel}
            tickerDurationHours={tickerDurationHours}
            setTickerDurationHours={setTickerDurationHours}
            sendMode={sendMode}
            setSendMode={setSendMode}
            minScheduledAt={minScheduledAt}
            scheduledAt={scheduledAt}
            setScheduledAt={setScheduledAt}
            setStep={setStep}
            sendLoading={sendLoading}
            submitSend={submitSend}
            canSubmitSend={canSubmitSend}
          />
        )}
      </div>

      {/* PREVIEW CARD */}
      <div className="w-full lg:sticky lg:top-6">
        <NotificationPreviewCard
          channel={channel}
          imageUrl={imageUrl}
          previewTitle={previewTitle}
          previewBody={previewBody}
          showPersonalImagePlaceholder={
            audienceType === "segment" &&
            PERSONAL_IMAGE_SEGMENTS.includes(segment) &&
            personalImage
          }
        />
      </div>
    </div>
  );
}

