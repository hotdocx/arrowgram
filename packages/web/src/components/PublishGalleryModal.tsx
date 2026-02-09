import React, { useState, useEffect } from "react";
import { X, Upload, Calendar, Tag, Image as ImageIcon } from "lucide-react";

interface PublishGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (metadata: {
    title: string;
    description: string;
    eventDate: Date | undefined;
    tags: string[];
    screenshotBlob: Blob;
  }) => Promise<void>;
  initialTitle: string;
  screenshotBlob: Blob | null;
}

export function PublishGalleryModal({
  isOpen,
  onClose,
  onConfirm,
  initialTitle,
  screenshotBlob,
}: PublishGalleryModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setDescription("");
      setEventDate("");
      setTagsInput("");
    }
  }, [isOpen, initialTitle]);

  useEffect(() => {
    if (screenshotBlob) {
      const url = URL.createObjectURL(screenshotBlob);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [screenshotBlob]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenshotBlob) return;

    setIsSubmitting(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await onConfirm({
        title,
        description,
        eventDate: eventDate ? new Date(eventDate) : undefined,
        tags,
        screenshotBlob,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Upload size={20} className="text-indigo-600" />
            Publish to Gallery
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="publish-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column: Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="e.g. Category Theory Intro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                    placeholder="Brief abstract or summary..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar size={14} />
                    Event Date
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Tag size={14} />
                    Tags
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="math, logic, 2024 (comma separated)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separate tags with commas.
                  </p>
                </div>
              </div>

              {/* Right Column: Screenshot Preview */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                  <ImageIcon size={14} />
                  Snapshot Preview
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden aspect-video relative group">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Snapshot"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-gray-400 flex flex-col items-center gap-2">
                      <div className="animate-pulse w-10 h-10 bg-gray-200 rounded-full"></div>
                      <span className="text-sm">Generating snapshot...</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  This snapshot will be displayed in the public gallery.
                </p>
              </div>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="publish-form"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={isSubmitting || !screenshotBlob}
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish Now"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
