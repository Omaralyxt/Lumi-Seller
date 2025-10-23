import { useEffect } from 'react';

/**
 * Define o título do documento (aba do navegador).
 * @param title O título da página.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const baseTitle = "Lumi Seller";
    document.title = `${title} | ${baseTitle}`;
    
    return () => {
      // Opcional: reverter para o título base ao desmontar, mas geralmente não é necessário em SPAs.
      // document.title = baseTitle;
    };
  }, [title]);
}