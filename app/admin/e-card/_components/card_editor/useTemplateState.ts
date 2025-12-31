import { useState } from 'react';
import type { PageData } from './types';

export function useTemplateState() {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [pricingType, setPricingType] = useState<'free' | 'premium'>('free');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState(1);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);

  const [isMultipage, setIsMultipage] = useState(false);
  const [pages, setPages] = useState<PageData[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  return {
    templateName,
    setTemplateName,
    templateDescription,
    setTemplateDescription,
    pricingType,
    setPricingType,
    price,
    setPrice,
    categoryId,
    setCategoryId,
    subcategoryId,
    setSubcategoryId,
    isMultipage,
    setIsMultipage,
    pages,
    setPages,
    currentPageIndex,
    setCurrentPageIndex,
  };
}
