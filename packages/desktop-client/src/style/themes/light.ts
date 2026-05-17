// FINANCE FORK: Mercury-inspired light theme overrides.
// Only token values are customized; export names are preserved verbatim so
// upstream rebases stay mechanical (resolve conflicts by keeping our values).
// See docs/design.md for design intent and docs/rebase-strategy.md for resolution.
import * as colorPalette from '#style/palette';

export const pageBackground = '#fafaf9'; // FINANCE FORK
export const pageBackgroundModalActive = '#f1f0ee'; // FINANCE FORK
export const pageBackgroundTopLeft = '#fafaf9'; // FINANCE FORK
export const pageBackgroundBottomRight = '#fafaf9'; // FINANCE FORK
export const pageBackgroundLineTop = '#ffffff'; // FINANCE FORK
export const pageBackgroundLineMid = '#fafaf9'; // FINANCE FORK
export const pageBackgroundLineBottom = '#fafaf9'; // FINANCE FORK
export const pageText = '#0a1628'; // FINANCE FORK
export const pageTextLight = '#475569'; // FINANCE FORK
export const pageTextSubdued = '#94a3b8'; // FINANCE FORK
export const pageTextDark = '#0a1628'; // FINANCE FORK
export const pageTextPositive = colorPalette.purple600;
export const pageTextLink = colorPalette.blue600;
export const pageTextLinkLight = colorPalette.blue300;

export const cardBackground = '#ffffff'; // FINANCE FORK
export const cardBorder = '#f0eeec'; // FINANCE FORK (near-background)
export const cardShadow = 'rgba(15, 23, 42, 0.04)'; // FINANCE FORK (subtle)

export const tableBackground = '#ffffff'; // FINANCE FORK
export const tableRowBackgroundHover = '#f5f4f2'; // FINANCE FORK (bg shift, not border)
export const tableText = pageText;
export const tableTextLight = '#64748b'; // FINANCE FORK
export const tableTextSubdued = '#94a3b8'; // FINANCE FORK
export const tableTextSelected = '#0a1628'; // FINANCE FORK
export const tableTextHover = '#0a1628'; // FINANCE FORK
export const tableTextInactive = '#94a3b8'; // FINANCE FORK
export const tableHeaderText = '#64748b'; // FINANCE FORK
export const tableHeaderBackground = '#fafaf9'; // FINANCE FORK
export const tableBorder = '#f0eeec'; // FINANCE FORK (near-background)
export const tableBorderSelected = '#586cb1'; // FINANCE FORK (accent)
export const tableBorderHover = '#e7e5e1'; // FINANCE FORK (near-background)
export const tableBorderSeparator = '#e7e5e1'; // FINANCE FORK (near-background)
export const tableRowBackgroundHighlight = '#eef0fa'; // FINANCE FORK (accent tint)
export const tableRowBackgroundHighlightText = '#0a1628'; // FINANCE FORK
export const tableRowHeaderBackground = '#f5f4f2'; // FINANCE FORK
export const tableRowHeaderText = '#0a1628'; // FINANCE FORK

export const numberPositive = '#16a34a'; // FINANCE FORK
export const numberNegative = '#dc2626'; // FINANCE FORK
export const numberNeutral = colorPalette.navy100;
export const budgetNumberNegative = numberNegative;
export const budgetNumberZero = tableTextSubdued;
export const budgetNumberNeutral = tableText;
export const budgetNumberPositive = budgetNumberNeutral;
export const templateNumberFunded = numberPositive;
export const templateNumberUnderFunded = colorPalette.orange700;
export const toBudgetPositive = numberPositive;
export const toBudgetZero = numberPositive;
export const toBudgetNegative = budgetNumberNegative;

export const sidebarBackground = '#f5f4f2'; // FINANCE FORK (reads as canvas, not panel)
export const sidebarItemBackgroundPending = colorPalette.orange200;
export const sidebarItemBackgroundPositive = colorPalette.green500;
export const sidebarItemBackgroundFailed = colorPalette.red300;
export const sidebarItemBackgroundHover = '#ececea'; // FINANCE FORK
export const sidebarItemAccentSelected = '#586cb1'; // FINANCE FORK (accent)
export const sidebarItemText = '#475569'; // FINANCE FORK
export const sidebarItemTextSelected = '#0a1628'; // FINANCE FORK (bold selection)
export const sidebarBudgetName = '#475569'; // FINANCE FORK

export const menuBackground = colorPalette.white;
export const menuItemBackground = colorPalette.navy50;
export const menuItemBackgroundHover = colorPalette.navy100;
export const menuItemText = colorPalette.navy900;
export const menuItemTextHover = menuItemText;
export const menuItemTextSelected = colorPalette.purple300;
export const menuItemTextHeader = colorPalette.navy400;
export const menuBorder = colorPalette.navy100;
export const menuBorderHover = colorPalette.purple100;
export const menuKeybindingText = colorPalette.navy400;
export const menuAutoCompleteBackground = colorPalette.navy900;
export const menuAutoCompleteBackgroundHover = colorPalette.navy600;
export const menuAutoCompleteText = colorPalette.white;
export const menuAutoCompleteTextHover = colorPalette.green150;
export const menuAutoCompleteTextHeader = colorPalette.orange150;
export const menuAutoCompleteItemTextHover = menuAutoCompleteText;
export const menuAutoCompleteItemText = menuAutoCompleteText;

export const modalBackground = colorPalette.white;
export const modalBorder = colorPalette.white;
export const mobileHeaderBackground = colorPalette.purple400;
export const mobileHeaderText = colorPalette.navy50;
export const mobileHeaderTextSubdued = colorPalette.gray200;
export const mobileHeaderTextHover = 'rgba(200, 200, 200, .15)';
export const mobilePageBackground = colorPalette.navy50;
export const mobileNavBackground = colorPalette.white;
export const mobileNavItem = colorPalette.gray300;
export const mobileNavItemSelected = colorPalette.purple500;
export const mobileAccountShadow = colorPalette.navy300;
export const mobileAccountText = colorPalette.blue800;
export const mobileTransactionSelected = colorPalette.purple500;

// Mobile view themes (for the top bar)
export const mobileViewTheme = mobileHeaderBackground;
export const mobileConfigServerViewTheme = colorPalette.purple500;

export const markdownNormal = colorPalette.purple150;
export const markdownDark = colorPalette.purple400;
export const markdownLight = colorPalette.purple100;

// Button
export const buttonMenuText = colorPalette.navy100;
export const buttonMenuTextHover = colorPalette.navy50;
export const buttonMenuBackground = 'transparent';
export const buttonMenuBackgroundHover = 'rgba(200, 200, 200, .25)';
export const buttonMenuBorder = colorPalette.navy500;
export const buttonMenuSelectedText = colorPalette.green800;
export const buttonMenuSelectedTextHover = colorPalette.orange800;
export const buttonMenuSelectedBackground = colorPalette.orange200;
export const buttonMenuSelectedBackgroundHover = colorPalette.orange300;
export const buttonMenuSelectedBorder = buttonMenuSelectedBackground;

export const buttonPrimaryText = colorPalette.white;
export const buttonPrimaryTextHover = buttonPrimaryText;
export const buttonPrimaryBackground = '#586cb1'; // FINANCE FORK (restrained accent)
export const buttonPrimaryBackgroundHover = '#4a5d9e'; // FINANCE FORK
export const buttonPrimaryBorder = buttonPrimaryBackground;
export const buttonPrimaryShadow = 'rgba(0, 0, 0, 0.3)';
export const buttonPrimaryDisabledText = colorPalette.white;
export const buttonPrimaryDisabledBackground = colorPalette.navy300;
export const buttonPrimaryDisabledBorder = buttonPrimaryDisabledBackground;

export const buttonNormalText = colorPalette.navy900;
export const buttonNormalTextHover = buttonNormalText;
export const buttonNormalBackground = colorPalette.white;
export const buttonNormalBackgroundHover = buttonNormalBackground;
export const buttonNormalBorder = colorPalette.navy150;
export const buttonNormalShadow = 'rgba(0, 0, 0, 0.2)';
export const buttonNormalSelectedText = colorPalette.white;
export const buttonNormalSelectedBackground = colorPalette.blue600;
export const buttonNormalDisabledText = colorPalette.navy300;
export const buttonNormalDisabledBackground = buttonNormalBackground;
export const buttonNormalDisabledBorder = buttonNormalBorder;

export const calendarText = colorPalette.navy50;
export const calendarBackground = colorPalette.navy900;
export const calendarItemText = colorPalette.navy150;
export const calendarItemBackground = colorPalette.navy800;
export const calendarSelectedBackground = colorPalette.navy500;

export const buttonBareText = buttonNormalText;
export const buttonBareTextHover = buttonNormalText;
export const buttonBareBackground = 'transparent';
export const buttonBareBackgroundHover = 'rgba(100, 100, 100, .15)';
export const buttonBareBackgroundActive = 'rgba(100, 100, 100, .25)';
export const buttonBareDisabledText = buttonNormalDisabledText;
export const buttonBareDisabledBackground = buttonBareBackground;

export const noticeBackground = colorPalette.green150;
export const noticeBackgroundLight = colorPalette.green100;
export const noticeBackgroundDark = colorPalette.green500;
export const noticeText = colorPalette.green700;
export const noticeTextLight = colorPalette.green500;
export const noticeTextDark = colorPalette.green900;
export const noticeTextMenu = colorPalette.green200;
export const noticeBorder = colorPalette.green500;
export const warningBackground = colorPalette.orange200;
export const warningText = colorPalette.orange700;
export const warningTextLight = colorPalette.orange500;
export const warningTextDark = colorPalette.orange900;
export const warningBorder = colorPalette.orange500;
export const errorBackground = colorPalette.red100;
export const errorText = colorPalette.red500;
export const errorTextDark = colorPalette.red700;
export const errorTextDarker = colorPalette.red900;
export const errorTextMenu = colorPalette.red200;
export const errorBorder = colorPalette.red500;
export const upcomingBackground = colorPalette.purple100;
export const upcomingText = colorPalette.purple700;
export const upcomingBorder = colorPalette.purple500;

export const formLabelText = colorPalette.blue600;
export const formLabelBackground = colorPalette.blue200;
export const formInputBackground = colorPalette.navy50;
export const formInputBackgroundSelected = colorPalette.white;
export const formInputBackgroundSelection = colorPalette.purple500;
export const formInputBorder = colorPalette.navy150;
export const formInputTextReadOnlySelection = colorPalette.navy50;
export const formInputBorderSelected = colorPalette.purple500;
export const formInputText = colorPalette.navy900;
export const formInputTextSelected = colorPalette.navy50;
export const formInputTextPlaceholder = colorPalette.navy300;
export const formInputTextPlaceholderSelected = colorPalette.navy200;
export const formInputTextSelection = colorPalette.navy100;
export const formInputShadowSelected = colorPalette.purple300;
export const formInputTextHighlight = colorPalette.purple200;
export const checkboxText = tableBackground;
export const checkboxBackgroundSelected = colorPalette.blue500;
export const checkboxBorderSelected = colorPalette.blue500;
export const checkboxShadowSelected = colorPalette.blue300;
export const checkboxToggleBackground = colorPalette.gray400;
export const checkboxToggleBackgroundSelected = colorPalette.purple600;
export const checkboxToggleDisabled = colorPalette.gray200;

export const pillBackground = colorPalette.navy150;
export const pillBackgroundLight = colorPalette.navy50;
export const pillText = colorPalette.navy800;
export const pillTextHighlighted = colorPalette.purple600;
export const pillBorder = colorPalette.navy150;
export const pillBorderDark = colorPalette.navy300;
export const pillBackgroundSelected = colorPalette.blue150;
export const pillTextSelected = colorPalette.blue900;
export const pillBorderSelected = colorPalette.purple500;
export const pillTextSubdued = colorPalette.navy200;

export const reportsRed = colorPalette.red300;
export const reportsBlue = colorPalette.blue400;
export const reportsGreen = colorPalette.green400;
export const reportsGray = colorPalette.gray400;
export const reportsLabel = colorPalette.navy900;
export const reportsInnerLabel = colorPalette.navy800;
export const reportsNumberPositive = numberPositive;
export const reportsNumberNegative = numberNegative;
export const reportsNumberNeutral = numberNeutral;
export const reportsChartFill = reportsNumberPositive;

export const noteTagBackground = colorPalette.purple125;
export const noteTagBackgroundHover = colorPalette.purple150;
export const noteTagDefault = colorPalette.purple125;
export const noteTagText = colorPalette.black;

export const budgetCurrentMonth = tableBackground;
export const budgetOtherMonth = colorPalette.gray50;
export const budgetHeaderCurrentMonth = budgetOtherMonth;
export const budgetHeaderOtherMonth = colorPalette.gray80;

export const floatingActionBarBackground = colorPalette.purple400;
export const floatingActionBarBorder = floatingActionBarBackground;
export const floatingActionBarText = colorPalette.navy50;

export const tooltipText = colorPalette.navy900;
export const tooltipBackground = colorPalette.white;
export const tooltipBorder = colorPalette.navy150;

export const calendarCellBackground = colorPalette.navy100;

export const overlayBackground = 'rgba(0, 0, 0, 0.3)';

// Chart colors - Qualitative scale (9 colors)
export const chartQual1 = colorPalette.chartQual1;
export const chartQual2 = colorPalette.chartQual2;
export const chartQual3 = colorPalette.chartQual3;
export const chartQual4 = colorPalette.chartQual4;
export const chartQual5 = colorPalette.chartQual5;
export const chartQual6 = colorPalette.chartQual6;
export const chartQual7 = colorPalette.chartQual7;
export const chartQual8 = colorPalette.chartQual8;
export const chartQual9 = colorPalette.chartQual9;
