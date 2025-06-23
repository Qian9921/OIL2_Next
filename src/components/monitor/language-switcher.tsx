"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { useI18n, Language } from '@/lib/i18n';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useI18n();

  const toggleLanguage = () => {
    const newLanguage: Language = language === 'en' ? 'zh' : 'en';
    setLanguage(newLanguage);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
    >
      <Globe className="h-4 w-4" />
      <span className="text-sm font-medium">
        {language === 'en' ? '中文' : 'EN'}
      </span>
    </Button>
  );
}; 