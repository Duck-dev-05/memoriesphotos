"use client";

import React from "react";
import Link from "next/link";
import { useSelection, PhotoType } from "../contexts/SelectionContext";
import styles from "./SelectablePhoto.module.css";

interface SelectablePhotoProps {
  photo: PhotoType;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function SelectablePhoto({ photo, children, className, style }: SelectablePhotoProps) {
  const { isSelectionMode, isSelected, togglePhoto } = useSelection();
  const selected = isSelected(photo.id);

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      togglePhoto(photo);
    }
  };

  return (
    <div 
      className={`${styles.wrapper} ${selected ? styles.selected : ''} ${className || ''}`}
      style={style}
      onClick={handleClick}
    >
      <Link href={`/photo/${photo.id}`} className={styles.link} style={{ display: 'block', height: '100%', width: '100%', textDecoration: 'none' }} onClick={(e) => {
        // Double check just in case link fires
        if (isSelectionMode) e.preventDefault();
      }}>
        {children}
      </Link>
      
      {isSelectionMode && (
        <div className={`${styles.checkbox} ${selected ? styles.checked : ''}`}>
          {selected && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          )}
        </div>
      )}
    </div>
  );
}
