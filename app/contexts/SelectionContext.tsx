"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type PhotoType = {
  id: string;
  url?: string | null;
  altText?: string;
};

interface SelectionContextType {
  isSelectionMode: boolean;
  selectedPhotos: PhotoType[];
  toggleSelectionMode: () => void;
  togglePhoto: (photo: PhotoType) => void;
  clearSelection: () => void;
  isSelected: (photoId: string) => boolean;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoType[]>([]);

  const toggleSelectionMode = () => {
    setIsSelectionMode((prev) => {
      if (prev) {
        setSelectedPhotos([]); // Clear selection when turning off
      }
      return !prev;
    });
  };

  const togglePhoto = (photo: PhotoType) => {
    setSelectedPhotos((prev) => {
      const exists = prev.find((p) => p.id === photo.id);
      if (exists) {
        return prev.filter((p) => p.id !== photo.id);
      }
      return [...prev, photo];
    });
  };

  const clearSelection = () => {
    setSelectedPhotos([]);
    setIsSelectionMode(false);
  };

  const isSelected = (photoId: string) => {
    return selectedPhotos.some((p) => p.id === photoId);
  };

  return (
    <SelectionContext.Provider
      value={{
        isSelectionMode,
        selectedPhotos,
        toggleSelectionMode,
        togglePhoto,
        clearSelection,
        isSelected,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return context;
}
