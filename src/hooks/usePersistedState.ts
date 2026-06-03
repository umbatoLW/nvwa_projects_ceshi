'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * 通用状态持久化 Hook
 * 将状态保存到 localStorage，页面切换后恢复
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // 初始化时从 localStorage 读取
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn(`Failed to load persisted state for key "${key}":`, error);
    }
    return initialValue;
  });

  // 保存到 localStorage
  const setPersistedState = useCallback((value: T | ((prev: T) => T)) => {
    setState((prev) => {
      const newValue = value instanceof Function ? value(prev) : value;
      try {
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch (error) {
        console.warn(`Failed to persist state for key "${key}":`, error);
      }
      return newValue;
    });
  }, [key]);

  // 清除持久化状态
  const clearPersistedState = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to clear persisted state for key "${key}":`, error);
    }
    setState(initialValue);
  }, [key, initialValue]);

  return [state, setPersistedState, clearPersistedState];
}

/**
 * 批量持久化多个状态的 Hook
 * 适用于需要同时持久化多个相关状态的场景
 */
export function usePersistedStates<T extends Record<string, unknown>>(
  key: string,
  initialValues: T
): [T, (updates: Partial<T>) => void, () => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValues;
    
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        // 合并保存的值和默认值，确保新增字段有默认值
        return { ...initialValues, ...parsed };
      }
    } catch (error) {
      console.warn(`Failed to load persisted states for key "${key}":`, error);
    }
    return initialValues;
  });

  const updateState = useCallback((updates: Partial<T>) => {
    setState((prev) => {
      const newValue = { ...prev, ...updates };
      try {
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch (error) {
        console.warn(`Failed to persist states for key "${key}":`, error);
      }
      return newValue;
    });
  }, [key]);

  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to clear persisted states for key "${key}":`, error);
    }
    setState(initialValues);
  }, [key, initialValues]);

  return [state, updateState, clearState];
}

// AI创作页面的持久化 key 常量
export const PERSISTENCE_KEYS = {
  IMAGE_CREATE: 'nvwa-image-create-state',
  VIDEO_CREATE: 'nvwa-video-create-state',
  REFERENCE_IMAGE: 'nvwa-reference-image-state',
  IMAGE_TO_VIDEO: 'nvwa-image-to-video-state',
  FIRST_LAST_FRAME: 'nvwa-first-last-frame-state',
} as const;
