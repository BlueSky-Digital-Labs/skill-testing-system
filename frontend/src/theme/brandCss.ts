export function applyBrandCssVariables(primaryColor: string, secondaryColor: string): void {
  document.documentElement.style.setProperty('--brand-primary', primaryColor)
  document.documentElement.style.setProperty('--brand-secondary', secondaryColor)
  document.documentElement.style.setProperty('--hd-secondary', primaryColor)
  document.documentElement.style.setProperty('--hd-sidebar-active', primaryColor)
  document.documentElement.style.setProperty('--hd-sidebar-bg', secondaryColor)
}
