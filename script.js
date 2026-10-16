/**
 * billable.co — Pure Vanilla JavaScript Engine
 * Accurate bill splitting down to integer paise/cents, multi-currency support,
 * base currency conversion, localStorage persistence, custom split balancing,
 * tip calculation, history management, and sharing.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Currencies & Exchange Rate Benchmarks
  // ---------------------------------------------------------------------------
  const CURRENCIES = {
    INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2, defaultRateUSD: 83.50, isPrefix: true },
    USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2, defaultRateUSD: 1.00, isPrefix: true },
    EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2, defaultRateUSD: 0.92, isPrefix: true },
    GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2, defaultRateUSD: 0.78, isPrefix: true },
    AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', decimals: 2, defaultRateUSD: 3.67, isPrefix: false },
    SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2, defaultRateUSD: 1.34, isPrefix: true },
    CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2, defaultRateUSD: 1.36, isPrefix: true },
    AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2, defaultRateUSD: 1.52, isPrefix: true },
    JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0, defaultRateUSD: 152.0, isPrefix: true },
    THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', decimals: 2, defaultRateUSD: 36.50, isPrefix: true },
  };

  const STORAGE_KEYS = {
    ACTIVE_STATE: 'billable_active_state_v2',
    HISTORY: 'billable_history_v2',
  };

  // ---------------------------------------------------------------------------
  // 2. Application State
  // ---------------------------------------------------------------------------
  const state = {
    currency: 'INR', // Bill currency
    occasion: '',
    amountRaw: '',
    splitMode: 'equal', // 'equal' | 'custom'
    equalPeopleCount: 3,
    equalCustomNames: {}, // index -> name
    customParticipants: [
      { id: 'p-1', name: '', amount: '' },
      { id: 'p-2', name: '', amount: '' },
      { id: 'p-3', name: '', amount: '' },
    ],
    // Tip settings
    tipEnabled: false,
    tipRate: 10, // percentage
    isCustomTip: false,
    // Home Currency Conversion settings
    conversionEnabled: false,
    homeCurrency: 'USD',
    exchangeRate: 0.0120, // 1 INR = 0.012 USD
    isCustomRate: false,
    // Active calculation & history
    activeCalculation: null,
    history: [],
  };

  // ---------------------------------------------------------------------------
  // 3. DOM Elements Cache
  // ---------------------------------------------------------------------------
  const el = {
    // Header currency dropdown
    currencySelect: document.getElementById('currency-select'),
    headerCurrencyIcon: document.getElementById('header-currency-icon'),
    btnNewBill: document.getElementById('btn-new-bill'),

    // Status banner
    statusMessage: document.getElementById('status-message'),

    // Form & groups
    form: document.getElementById('bill-form'),
    occasionInput: document.getElementById('occasion-input'),
    amountInput: document.getElementById('amount-input'),
    billCurrencyPrefix: document.getElementById('bill-currency-prefix'),
    amountHint: document.getElementById('amount-hint'),
    errorOccasion: document.getElementById('error-occasion'),
    errorAmount: document.getElementById('error-amount'),
    errorPeople: document.getElementById('error-people'),
    errorCustom: document.getElementById('error-custom'),
    errorTip: document.getElementById('error-tip'),
    generalFormError: document.getElementById('general-form-error'),

    // Split mode
    modeEqualBtn: document.getElementById('mode-equal-btn'),
    modeCustomBtn: document.getElementById('mode-custom-btn'),
    equalSettingsPanel: document.getElementById('equal-settings-panel'),
    customSettingsPanel: document.getElementById('custom-settings-panel'),

    // Equal mode controls
    peopleInput: document.getElementById('people-input'),
    btnDecrementPeople: document.getElementById('btn-decrement-people'),
    btnIncrementPeople: document.getElementById('btn-increment-people'),
    btnToggleNames: document.getElementById('btn-toggle-names'),
    namesContainer: document.getElementById('names-container'),
    equalNamesList: document.getElementById('equal-names-list'),

    // Custom mode controls
    customList: document.getElementById('custom-participants-list'),
    btnAddPerson: document.getElementById('btn-add-person'),
    customTargetAmount: document.getElementById('custom-target-amount'),
    customAllocatedAmount: document.getElementById('custom-allocated-amount'),
    customDifferenceLabel: document.getElementById('custom-difference-label'),
    customDifferenceAmount: document.getElementById('custom-difference-amount'),
    customBalanceMessage: document.getElementById('custom-balance-message'),
    btnAutoBalance: document.getElementById('btn-auto-balance'),

    // Tip controls
    tipToggle: document.getElementById('tip-toggle'),
    tipControls: document.getElementById('tip-controls'),
    tipIndicator: document.getElementById('tip-indicator'),
    tipChips: document.querySelectorAll('.tip-chip'),
    customTipGroup: document.getElementById('custom-tip-input-group'),
    customTipInput: document.getElementById('custom-tip-input'),
    tipPreviewAmount: document.getElementById('tip-preview-amount'),
    tipPreviewTotal: document.getElementById('tip-preview-total'),

    // Base Conversion controls
    convertToggle: document.getElementById('convert-toggle'),
    conversionIndicator: document.getElementById('conversion-indicator'),
    conversionControls: document.getElementById('conversion-controls'),
    homeCurrencySelect: document.getElementById('home-currency-select'),
    homeCurrencyIcon: document.getElementById('home-currency-icon'),
    rateFormulaLabel: document.getElementById('rate-formula-label'),
    exchangeRateInput: document.getElementById('exchange-rate-input'),
    btnResetRate: document.getElementById('btn-reset-rate'),
    conversionPreviewSummary: document.getElementById('conversion-preview-summary'),

    // Form buttons
    btnSubmitSplit: document.getElementById('btn-submit-split'),
    btnResetForm: document.getElementById('btn-reset-form'),

    // Results card
    resultCard: document.getElementById('result-card'),
    resultEmptyState: document.getElementById('result-empty-state'),
    resultCalculatedState: document.getElementById('result-calculated-state'),
    resultModeTag: document.getElementById('result-mode-tag'),
    resultHeading: document.getElementById('result-heading'),
    resultTimestamp: document.getElementById('result-timestamp'),
    resultCurrencyPill: document.getElementById('result-currency-pill'),
    summaryOriginalBill: document.getElementById('summary-original-bill'),
    summaryTipBox: document.getElementById('summary-tip-box'),
    summaryTipAmount: document.getElementById('summary-tip-amount'),
    summaryTipRate: document.getElementById('summary-tip-rate'),
    summaryFinalTotal: document.getElementById('summary-final-total'),
    summaryConvertedTotal: document.getElementById('summary-converted-total'),
    resultConversionBanner: document.getElementById('result-conversion-banner'),
    resultConversionText: document.getElementById('result-conversion-text'),
    resultPeopleCount: document.getElementById('result-people-count'),
    resultTipNote: document.getElementById('result-tip-note'),
    sharesList: document.getElementById('shares-list'),
    auditSharesTotal: document.getElementById('audit-shares-total'),
    auditSharesConverted: document.getElementById('audit-shares-converted'),
    btnCopyBill: document.getElementById('btn-copy-bill'),
    btnShareBill: document.getElementById('btn-share-bill'),

    // History section
    historySection: document.getElementById('history-section'),
    historyList: document.getElementById('history-list'),
    historyEmpty: document.getElementById('history-empty'),
    historyBadgeCount: document.getElementById('history-badge-count'),
    btnClearHistory: document.getElementById('btn-clear-history'),
    clearConfirmPanel: document.getElementById('clear-confirm-panel'),
    btnConfirmClear: document.getElementById('btn-confirm-clear'),
    btnCancelClear: document.getElementById('btn-cancel-clear'),

    // Toast
    toastContainer: document.getElementById('toast-container'),
  };

  // ---------------------------------------------------------------------------
  // 4. Utility Functions (Currency Formatting & Integer Precision)
  // ---------------------------------------------------------------------------
  /**
   * Converts monetary float amount into integer base units (cents/paise).
   */
  function toIntegerUnits(amount, currencyCode = state.currency) {
    if (amount === null || amount === undefined || isNaN(amount)) return 0;
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const curr = CURRENCIES[currencyCode] || CURRENCIES.INR;
    const factor = curr.decimals === 0 ? 1 : 100;
    return Math.round(num * factor);
  }

  /**
   * Converts integer units into formatted currency string.
   */
  function formatMoney(units, currencyCode = state.currency) {
    const curr = CURRENCIES[currencyCode] || CURRENCIES.INR;
    const factor = curr.decimals === 0 ? 1 : 100;
    const floatVal = (units / factor).toFixed(curr.decimals);

    const parts = floatVal.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formattedNum = parts.join('.');

    if (curr.isPrefix) {
      return `${curr.symbol}${formattedNum}`;
    } else {
      return `${formattedNum} ${curr.symbol}`;
    }
  }

  /**
   * Formats a date timestamp in a friendly, readable format.
   */
  function formatTimestamp(isoString) {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ' at ' + date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  }

  /**
   * Calculates the standard market benchmark rate between two currencies.
   */
  function getBenchmarkRate(fromCode, toCode) {
    if (fromCode === toCode) return 1.0;
    const fromCurr = CURRENCIES[fromCode] || CURRENCIES.INR;
    const toCurr = CURRENCIES[toCode] || CURRENCIES.USD;
    // from USD benchmark: 1 fromCurr = (toUSD / fromUSD) toCurr
    const rate = toCurr.defaultRateUSD / fromCurr.defaultRateUSD;
    return rate >= 1 ? parseFloat(rate.toFixed(4)) : parseFloat(rate.toFixed(5));
  }

  /**
   * Shows a friendly non-blocking toast message.
   */
  function showToast(message, type = 'success') {
    if (!el.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');

    const iconSvg = type === 'success' 
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ---------------------------------------------------------------------------
  // 5. Currency & Conversion Handlers
  // ---------------------------------------------------------------------------
  function updateCurrencyUI() {
    const curr = CURRENCIES[state.currency] || CURRENCIES.INR;
    el.headerCurrencyIcon.textContent = curr.symbol;
    el.billCurrencyPrefix.textContent = curr.symbol;
    el.amountHint.textContent = `Enter the total amount in ${curr.name} (${curr.symbol})`;

    // If home currency is set to the same as bill currency, switch it to an alternative
    if (state.homeCurrency === state.currency) {
      state.homeCurrency = state.currency === 'INR' ? 'USD' : 'INR';
      el.homeCurrencySelect.value = state.homeCurrency;
    }

    const homeCurr = CURRENCIES[state.homeCurrency] || CURRENCIES.USD;
    el.homeCurrencyIcon.textContent = homeCurr.symbol;

    // Rate formula label
    el.rateFormulaLabel.textContent = `1 ${state.currency} = X ${state.homeCurrency}`;

    // Update benchmark rate if not customized
    if (!state.isCustomRate) {
      state.exchangeRate = getBenchmarkRate(state.currency, state.homeCurrency);
      el.exchangeRateInput.value = state.exchangeRate;
    }

    updateConversionPreview();
    updateTipPreview();

    // Re-render custom participants with new prefix
    if (state.splitMode === 'custom') {
      renderCustomParticipantsInputs();
    }

    // If an active calculation exists, refresh its views
    if (state.activeCalculation) {
      renderCalculationResult(state.activeCalculation);
    }
  }

  function updateConversionPreview() {
    if (!state.conversionEnabled) return;
    const originalUnits = toIntegerUnits(parseFloat(el.amountInput.value) || 0, state.currency);
    const tipRate = state.tipEnabled ? (state.isCustomTip ? parseFloat(el.customTipInput.value) || 0 : state.tipRate) : 0;
    const tipUnits = state.tipEnabled ? Math.round((originalUnits * tipRate) / 100) : 0;
    const totalUnits = originalUnits + tipUnits;

    const rate = parseFloat(el.exchangeRateInput.value) || state.exchangeRate;
    const convertedUnits = Math.round(totalUnits * rate);

    const billStr = formatMoney(totalUnits, state.currency);
    const convStr = formatMoney(convertedUnits, state.homeCurrency);

    el.conversionPreviewSummary.textContent = `Rate: 1 ${state.currency} = ${rate} ${state.homeCurrency} · Bill Total: ${billStr} ≈ ${convStr}`;
  }

  // ---------------------------------------------------------------------------
  // 6. Validation Logic
  // ---------------------------------------------------------------------------
  function clearErrors() {
    [el.errorOccasion, el.errorAmount, el.errorPeople, el.errorCustom, el.errorTip].forEach(errEl => {
      if (errEl) {
        errEl.textContent = '';
        errEl.classList.remove('visible');
      }
    });
    if (el.generalFormError) {
      el.generalFormError.textContent = '';
      el.generalFormError.classList.add('hidden');
    }
    [el.occasionInput, el.amountInput, el.peopleInput, el.customTipInput, el.exchangeRateInput].forEach(inp => {
      if (inp) inp.classList.remove('is-invalid');
    });
  }

  function setFieldError(element, errorElement, message) {
    if (element) element.classList.add('is-invalid');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add('visible');
    }
  }

  function validateInputs() {
    clearErrors();
    let isValid = true;
    const curr = CURRENCIES[state.currency] || CURRENCIES.INR;

    // 1. Occasion name validation
    const occasionVal = el.occasionInput.value.trim();
    if (!occasionVal) {
      setFieldError(el.occasionInput, el.errorOccasion, 'Please enter an occasion or party name.');
      isValid = false;
    }

    // 2. Bill amount validation
    const amountVal = parseFloat(el.amountInput.value);
    if (isNaN(amountVal) || amountVal <= 0) {
      setFieldError(el.amountInput, el.errorAmount, `Please enter a valid bill amount greater than ${formatMoney(0, state.currency)}.`);
      isValid = false;
    } else if (amountVal > 99999999.99) {
      setFieldError(el.amountInput, el.errorAmount, 'Amount exceeds reasonable maximum limit.');
      isValid = false;
    }

    // 3. Tip validation
    if (state.tipEnabled) {
      const tipVal = state.isCustomTip ? parseFloat(el.customTipInput.value) : state.tipRate;
      if (isNaN(tipVal) || tipVal < 0) {
        setFieldError(el.customTipInput, el.errorTip, 'Tip percentage cannot be negative.');
        isValid = false;
      } else if (tipVal > 500) {
        setFieldError(el.customTipInput, el.errorTip, 'Tip percentage cannot exceed 500%.');
        isValid = false;
      }
    }

    // 4. Conversion rate validation
    if (state.conversionEnabled) {
      const rateVal = parseFloat(el.exchangeRateInput.value);
      if (isNaN(rateVal) || rateVal <= 0) {
        setFieldError(el.exchangeRateInput, el.generalFormError, 'Exchange rate must be a positive number.');
        isValid = false;
      }
    }

    // 5. Split mode specific validation
    if (state.splitMode === 'equal') {
      const peopleVal = parseInt(el.peopleInput.value, 10);
      if (isNaN(peopleVal) || peopleVal < 1 || !Number.isInteger(Number(el.peopleInput.value))) {
        setFieldError(el.peopleInput, el.errorPeople, 'Number of people must be a whole number of at least 1.');
        isValid = false;
      } else if (peopleVal > 100) {
        setFieldError(el.peopleInput, el.errorPeople, 'Maximum 100 people supported per split.');
        isValid = false;
      }
    } else {
      // Custom mode validation
      if (state.customParticipants.length < 1) {
        setFieldError(null, el.errorCustom, 'At least one participant is required.');
        isValid = false;
      }

      // Check contributions
      const originalUnits = toIntegerUnits(parseFloat(el.amountInput.value) || 0, state.currency);
      const tipRate = state.tipEnabled ? (state.isCustomTip ? parseFloat(el.customTipInput.value) || 0 : state.tipRate) : 0;
      const tipUnits = state.tipEnabled ? Math.round((originalUnits * tipRate) / 100) : 0;
      const targetUnits = originalUnits + tipUnits;

      let allocatedUnits = 0;
      let hasNegative = false;

      state.customParticipants.forEach(p => {
        const pAmount = parseFloat(p.amount) || 0;
        if (pAmount < 0) hasNegative = true;
        allocatedUnits += toIntegerUnits(pAmount, state.currency);
      });

      if (hasNegative) {
        setFieldError(null, el.errorCustom, 'Individual contributions cannot be negative.');
        isValid = false;
      } else if (allocatedUnits !== targetUnits) {
        const diffUnits = targetUnits - allocatedUnits;
        const diffStr = formatMoney(Math.abs(diffUnits), state.currency);
        if (diffUnits > 0) {
          setFieldError(
            null,
            el.errorCustom,
            `Contributions do not match total bill. Remaining to allocate: ${diffStr}.`
          );
        } else {
          setFieldError(
            null,
            el.errorCustom,
            `Contributions exceed total bill by ${diffStr}. Please reduce contributions to balance.`
          );
        }
        isValid = false;
      }
    }

    return isValid;
  }

  // ---------------------------------------------------------------------------
  // 7. Calculation Logic (Integer Units & Remainder Distribution)
  // ---------------------------------------------------------------------------
  function calculateBill() {
    const occasion = el.occasionInput.value.trim();
    const currency = state.currency;
    const originalUnits = toIntegerUnits(parseFloat(el.amountInput.value), currency);

    // Tip calculation
    let tipPercent = 0;
    let tipUnits = 0;
    if (state.tipEnabled) {
      tipPercent = state.isCustomTip ? (parseFloat(el.customTipInput.value) || 0) : state.tipRate;
      tipUnits = Math.round((originalUnits * tipPercent) / 100);
    }
    const finalTotalUnits = originalUnits + tipUnits;

    // Conversion data
    const isConversionActive = state.conversionEnabled;
    const homeCurrency = state.homeCurrency;
    const exchangeRate = isConversionActive ? (parseFloat(el.exchangeRateInput.value) || state.exchangeRate) : 1;
    const convertedTotalUnits = isConversionActive ? Math.round(finalTotalUnits * exchangeRate) : 0;

    let shares = [];

    if (state.splitMode === 'equal') {
      const numPeople = parseInt(el.peopleInput.value, 10);
      const baseUnitsPerPerson = Math.floor(finalTotalUnits / numPeople);
      const remainderUnits = finalTotalUnits % numPeople;

      for (let i = 0; i < numPeople; i++) {
        const customName = (state.equalCustomNames[i] || '').trim();
        const participantName = customName || `Person ${i + 1}`;
        
        // Fair distribution: first `remainderUnits` participants get 1 extra base unit
        const personShareUnits = i < remainderUnits 
          ? baseUnitsPerPerson + 1 
          : baseUnitsPerPerson;

        const convertedShareUnits = isConversionActive ? Math.round(personShareUnits * exchangeRate) : 0;

        shares.push({
          id: `p-${i + 1}`,
          index: i,
          name: participantName,
          customName: customName,
          shareUnits: personShareUnits,
          formattedShare: formatMoney(personShareUnits, currency),
          convertedShareUnits: convertedShareUnits,
          formattedConvertedShare: isConversionActive ? formatMoney(convertedShareUnits, homeCurrency) : '',
          hasExtraUnit: i < remainderUnits && remainderUnits > 0,
        });
      }
    } else {
      // Custom split mode
      state.customParticipants.forEach((p, idx) => {
        const pName = (p.name || '').trim() || `Person ${idx + 1}`;
        const pUnits = toIntegerUnits(parseFloat(p.amount) || 0, currency);
        const convertedShareUnits = isConversionActive ? Math.round(pUnits * exchangeRate) : 0;

        shares.push({
          id: p.id,
          index: idx,
          name: pName,
          customName: (p.name || '').trim(),
          shareUnits: pUnits,
          formattedShare: formatMoney(pUnits, currency),
          convertedShareUnits: convertedShareUnits,
          formattedConvertedShare: isConversionActive ? formatMoney(convertedShareUnits, homeCurrency) : '',
          hasExtraUnit: false,
        });
      });
    }

    const totalSharesUnits = shares.reduce((acc, curr) => acc + curr.shareUnits, 0);

    const calculation = {
      id: 'bill-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      occasion: occasion,
      currency: currency,
      splitMode: state.splitMode,
      originalAmountUnits: originalUnits,
      tipEnabled: state.tipEnabled,
      tipRate: tipPercent,
      tipUnits: tipUnits,
      finalTotalUnits: finalTotalUnits,
      // Conversion metadata
      conversionEnabled: isConversionActive,
      homeCurrency: homeCurrency,
      exchangeRate: exchangeRate,
      convertedTotalUnits: convertedTotalUnits,
      // Shares
      participantCount: shares.length,
      shares: shares,
      totalSharesUnits: totalSharesUnits,
    };

    return calculation;
  }

  // ---------------------------------------------------------------------------
  // 8. Render Result & Views
  // ---------------------------------------------------------------------------
  function renderCalculationResult(calc) {
    if (!calc) {
      el.resultCalculatedState.classList.add('hidden');
      el.resultEmptyState.classList.remove('hidden');
      el.statusMessage.textContent = 'Bill split ready — enter your bill details below to calculate fair shares';
      return;
    }

    const billCurr = calc.currency || state.currency;
    const currInfo = CURRENCIES[billCurr] || CURRENCIES.INR;

    // Header info
    el.resultModeTag.textContent = calc.splitMode === 'equal' ? 'Split Equally' : 'Custom Split';
    el.resultHeading.textContent = calc.occasion;
    el.resultTimestamp.textContent = formatTimestamp(calc.timestamp);
    el.resultPeopleCount.textContent = calc.shares.length;
    el.resultCurrencyPill.textContent = `${billCurr} (${currInfo.symbol})`;

    // Financial summaries
    el.summaryOriginalBill.textContent = formatMoney(calc.originalAmountUnits, billCurr);

    if (calc.tipEnabled && calc.tipUnits > 0) {
      el.summaryTipBox.classList.remove('hidden');
      el.summaryTipAmount.textContent = formatMoney(calc.tipUnits, billCurr);
      el.summaryTipRate.textContent = `${calc.tipRate}% tip`;
      el.resultTipNote.classList.remove('hidden');
    } else {
      el.summaryTipBox.classList.remove('hidden');
      el.summaryTipAmount.textContent = formatMoney(0, billCurr);
      el.summaryTipRate.textContent = 'No tip added';
      el.resultTipNote.classList.add('hidden');
    }

    el.summaryFinalTotal.textContent = formatMoney(calc.finalTotalUnits, billCurr);

    // Home conversion summary badge
    if (calc.conversionEnabled && calc.homeCurrency) {
      el.summaryConvertedTotal.classList.remove('hidden');
      el.summaryConvertedTotal.textContent = `≈ ${formatMoney(calc.convertedTotalUnits, calc.homeCurrency)} (${calc.homeCurrency})`;

      el.resultConversionBanner.classList.remove('hidden');
      el.resultConversionText.textContent = `Converted to ${calc.homeCurrency}: 1 ${billCurr} = ${calc.exchangeRate} ${calc.homeCurrency}`;

      el.auditSharesConverted.classList.remove('hidden');
      el.auditSharesConverted.textContent = `≈ ${formatMoney(calc.convertedTotalUnits, calc.homeCurrency)}`;
    } else {
      el.summaryConvertedTotal.classList.add('hidden');
      el.resultConversionBanner.classList.add('hidden');
      el.auditSharesConverted.classList.add('hidden');
    }

    // Render individual shares
    el.sharesList.innerHTML = '';
    calc.shares.forEach((person) => {
      const row = document.createElement('div');
      row.className = 'share-row';
      row.setAttribute('role', 'listitem');

      const initial = (person.name || 'P').charAt(0).toUpperCase();

      let metaText = calc.splitMode === 'equal' ? 'Equal share' : 'Custom contribution';
      if (person.hasExtraUnit) {
        metaText += ' · +1 fair balance';
      }

      let convertedLineHtml = '';
      if (calc.conversionEnabled && person.convertedShareUnits !== undefined) {
        convertedLineHtml = `<span class="share-converted-val">≈ ${escapeHtml(formatMoney(person.convertedShareUnits, calc.homeCurrency))} ${calc.homeCurrency}</span>`;
      }

      row.innerHTML = `
        <div class="share-user-info">
          <div class="user-avatar" aria-hidden="true">${escapeHtml(initial)}</div>
          <div class="user-details">
            <span class="user-name">${escapeHtml(person.name)}</span>
            <span class="user-meta">${escapeHtml(metaText)}</span>
          </div>
        </div>
        <div class="share-amount-wrap">
          <span class="share-amount">${escapeHtml(formatMoney(person.shareUnits, billCurr))}</span>
          ${convertedLineHtml}
        </div>
      `;
      el.sharesList.appendChild(row);
    });

    // Total audit reconciliation
    el.auditSharesTotal.textContent = formatMoney(calc.totalSharesUnits, billCurr);

    // Toggle card states
    el.resultEmptyState.classList.add('hidden');
    el.resultCalculatedState.classList.remove('hidden');

    // Update status banner
    el.statusMessage.textContent = `Bill split ready for "${calc.occasion}" — ${formatMoney(calc.finalTotalUnits, billCurr)} split among ${calc.shares.length} people.`;
  }

  // ---------------------------------------------------------------------------
  // 9. Custom Split Realtime Monitoring
  // ---------------------------------------------------------------------------
  function updateCustomBalanceMonitor() {
    const currency = state.currency;
    const originalUnits = toIntegerUnits(parseFloat(el.amountInput.value) || 0, currency);
    let tipUnits = 0;
    if (state.tipEnabled) {
      const tipRate = state.isCustomTip ? (parseFloat(el.customTipInput.value) || 0) : state.tipRate;
      tipUnits = Math.round((originalUnits * tipRate) / 100);
    }
    const targetUnits = originalUnits + tipUnits;

    let allocatedUnits = 0;
    state.customParticipants.forEach(p => {
      allocatedUnits += toIntegerUnits(parseFloat(p.amount) || 0, currency);
    });

    el.customTargetAmount.textContent = formatMoney(targetUnits, currency);
    el.customAllocatedAmount.textContent = formatMoney(allocatedUnits, currency);

    const diffUnits = targetUnits - allocatedUnits;
    el.customDifferenceAmount.classList.remove('balance-ok', 'balance-warn', 'balance-err');

    if (diffUnits === 0) {
      el.customDifferenceAmount.textContent = `${formatMoney(0, currency)} (Balanced)`;
      el.customDifferenceAmount.classList.add('balance-ok');
      el.customBalanceMessage.textContent = '✓ Perfectly balanced! Every unit is accounted for.';
      el.customBalanceMessage.style.color = 'var(--color-success)';
      el.btnAutoBalance.style.display = 'none';
    } else if (diffUnits > 0) {
      el.customDifferenceAmount.textContent = `+${formatMoney(diffUnits, currency)} unallocated`;
      el.customDifferenceAmount.classList.add('balance-warn');
      el.customBalanceMessage.textContent = `Need to assign ${formatMoney(diffUnits, currency)} more to match total.`;
      el.customBalanceMessage.style.color = 'var(--color-warning)';
      el.btnAutoBalance.style.display = 'inline-block';
    } else {
      el.customDifferenceAmount.textContent = `-${formatMoney(Math.abs(diffUnits), currency)} over-allocated`;
      el.customDifferenceAmount.classList.add('balance-err');
      el.customBalanceMessage.textContent = `Total exceeded by ${formatMoney(Math.abs(diffUnits), currency)}. Please reduce contributions.`;
      el.customBalanceMessage.style.color = 'var(--color-danger)';
      el.btnAutoBalance.style.display = 'none';
    }
  }

  function renderCustomParticipantsInputs() {
    el.customList.innerHTML = '';
    const curr = CURRENCIES[state.currency] || CURRENCIES.INR;

    state.customParticipants.forEach((p, index) => {
      const row = document.createElement('div');
      row.className = 'custom-row';
      row.setAttribute('data-id', p.id);

      const placeholderName = `Person ${index + 1}`;
      const isOnlyOne = state.customParticipants.length <= 1;

      row.innerHTML = `
        <input 
          type="text" 
          class="form-input custom-row-name" 
          placeholder="${escapeHtml(placeholderName)}" 
          value="${escapeHtml(p.name)}" 
          maxlength="40"
          aria-label="Name for participant ${index + 1}"
        />
        <div class="input-with-prefix">
          <span class="input-prefix" aria-hidden="true">${curr.symbol}</span>
          <input 
            type="number" 
            class="form-input with-prefix custom-row-amount" 
            placeholder="0.00" 
            step="0.01" 
            min="0" 
            value="${escapeHtml(p.amount)}" 
            aria-label="Contribution for participant ${index + 1}"
          />
        </div>
        <button 
          type="button" 
          class="btn-remove-row" 
          aria-label="Remove participant" 
          ${isOnlyOne ? 'disabled title="At least one participant required"' : 'title="Remove participant"'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      `;

      const nameInp = row.querySelector('.custom-row-name');
      const amountInp = row.querySelector('.custom-row-amount');
      const removeBtn = row.querySelector('.btn-remove-row');

      nameInp.addEventListener('input', (e) => {
        p.name = e.target.value;
        saveActiveState();
      });

      amountInp.addEventListener('input', (e) => {
        p.amount = e.target.value;
        updateCustomBalanceMonitor();
        saveActiveState();
      });

      removeBtn.addEventListener('click', () => {
        if (state.customParticipants.length <= 1) return;
        state.customParticipants = state.customParticipants.filter(item => item.id !== p.id);
        renderCustomParticipantsInputs();
        updateCustomBalanceMonitor();
        saveActiveState();
      });

      el.customList.appendChild(row);
    });

    updateCustomBalanceMonitor();
  }

  // ---------------------------------------------------------------------------
  // 10. Equal Split Names Drawer
  // ---------------------------------------------------------------------------
  function renderEqualCustomNamesInputs() {
    el.equalNamesList.innerHTML = '';
    const count = state.equalPeopleCount;

    for (let i = 0; i < count; i++) {
      const row = document.createElement('div');
      row.className = 'name-input-row';

      const defaultLabel = `Person ${i + 1}`;
      const savedVal = state.equalCustomNames[i] || '';

      row.innerHTML = `
        <span class="name-input-label">${escapeHtml(defaultLabel)}</span>
        <input 
          type="text" 
          class="form-input name-input-field" 
          placeholder="e.g. Shlok, Het, Nayan" 
          value="${escapeHtml(savedVal)}" 
          maxlength="40"
          data-index="${i}"
        />
      `;

      const input = row.querySelector('input');
      input.addEventListener('input', (e) => {
        const val = e.target.value;
        state.equalCustomNames[i] = val;

        if (state.activeCalculation && state.activeCalculation.splitMode === 'equal') {
          if (state.activeCalculation.shares[i]) {
            state.activeCalculation.shares[i].customName = val.trim();
            state.activeCalculation.shares[i].name = val.trim() || `Person ${i + 1}`;
            renderCalculationResult(state.activeCalculation);
          }
        }
        saveActiveState();
      });

      el.equalNamesList.appendChild(row);
    }
  }

  // ---------------------------------------------------------------------------
  // 11. Tip UI Update
  // ---------------------------------------------------------------------------
  function updateTipPreview() {
    const currency = state.currency;
    const originalUnits = toIntegerUnits(parseFloat(el.amountInput.value) || 0, currency);
    if (!state.tipEnabled || originalUnits <= 0) {
      el.tipPreviewAmount.textContent = formatMoney(0, currency);
      el.tipPreviewTotal.textContent = formatMoney(originalUnits, currency);
      return;
    }

    const tipRate = state.isCustomTip ? (parseFloat(el.customTipInput.value) || 0) : state.tipRate;
    const tipUnits = Math.round((originalUnits * tipRate) / 100);
    const totalUnits = originalUnits + tipUnits;

    el.tipPreviewAmount.textContent = formatMoney(tipUnits, currency);
    el.tipPreviewTotal.textContent = formatMoney(totalUnits, currency);
  }

  // ---------------------------------------------------------------------------
  // 12. History Management
  // ---------------------------------------------------------------------------
  function renderHistory() {
    const list = state.history;
    el.historyBadgeCount.textContent = `${list.length} saved`;

    if (!list || list.length === 0) {
      el.historyList.innerHTML = '';
      el.historyEmpty.classList.remove('hidden');
      el.btnClearHistory.classList.add('hidden');
      return;
    }

    el.historyEmpty.classList.add('hidden');
    el.btnClearHistory.classList.remove('hidden');
    el.historyList.innerHTML = '';

    list.forEach((bill) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.setAttribute('data-id', bill.id);

      const billCurr = bill.currency || 'INR';
      const modeLabel = bill.splitMode === 'equal' ? 'Split Equally' : 'Custom Split';
      const tipLabel = bill.tipEnabled && bill.tipUnits > 0 ? ` · ${bill.tipRate}% tip` : '';
      const convLabel = bill.conversionEnabled ? ` · Converted to ${bill.homeCurrency}` : '';

      let convertedHistorySub = '';
      if (bill.conversionEnabled && bill.convertedTotalUnits) {
        convertedHistorySub = `<span class="history-item-converted">≈ ${formatMoney(bill.convertedTotalUnits, bill.homeCurrency)} (${bill.homeCurrency})</span>`;
      }

      item.innerHTML = `
        <div class="history-item-top">
          <span class="history-item-occasion">${escapeHtml(bill.occasion)}</span>
          <div class="history-amounts-wrap">
            <span class="history-item-amount">${escapeHtml(formatMoney(bill.finalTotalUnits, billCurr))}</span>
            ${convertedHistorySub}
          </div>
        </div>
        <div class="history-item-meta">
          <span>${escapeHtml(formatTimestamp(bill.timestamp))}</span>
          <span>·</span>
          <span>${billCurr}</span>
          <span>·</span>
          <span>${bill.shares.length} people</span>
          <span>·</span>
          <span>${escapeHtml(modeLabel)}${escapeHtml(tipLabel)}${escapeHtml(convLabel)}</span>
        </div>
        <div class="history-item-actions">
          <button type="button" class="btn btn-outline btn-xs btn-load-bill" title="Load this bill into the calculator">
            Review / Load
          </button>
          <button type="button" class="btn btn-text btn-xs text-danger btn-delete-bill" title="Delete this entry">
            Delete
          </button>
        </div>
      `;

      item.querySelector('.btn-load-bill').addEventListener('click', () => {
        loadBillFromHistory(bill);
      });

      item.querySelector('.btn-delete-bill').addEventListener('click', () => {
        deleteBillFromHistory(bill.id);
      });

      el.historyList.appendChild(item);
    });
  }

  function saveToHistory(calculation) {
    if (!calculation) return;

    const isDuplicate = state.history.some(h => 
      h.occasion === calculation.occasion &&
      h.finalTotalUnits === calculation.finalTotalUnits &&
      h.currency === calculation.currency &&
      h.shares.length === calculation.shares.length &&
      Math.abs(new Date(h.timestamp).getTime() - new Date(calculation.timestamp).getTime()) < 5000
    );

    if (isDuplicate) return;

    state.history.unshift(calculation);
    if (state.history.length > 50) {
      state.history = state.history.slice(0, 50);
    }
    saveHistoryState();
    renderHistory();
  }

  function deleteBillFromHistory(id) {
    state.history = state.history.filter(b => b.id !== id);
    saveHistoryState();
    renderHistory();
    showToast('Bill removed from history', 'success');
  }

  function clearAllHistory() {
    state.history = [];
    saveHistoryState();
    renderHistory();
    el.clearConfirmPanel.classList.add('hidden');
    showToast('All bill history cleared', 'success');
  }

  function loadBillFromHistory(bill) {
    // 1. Currency
    state.currency = bill.currency || 'INR';
    el.currencySelect.value = state.currency;

    // 2. Form values
    el.occasionInput.value = bill.occasion;
    const factor = (CURRENCIES[state.currency] || CURRENCIES.INR).decimals === 0 ? 1 : 100;
    el.amountInput.value = (bill.originalAmountUnits / factor).toFixed((CURRENCIES[state.currency] || CURRENCIES.INR).decimals);

    // 3. Tip
    state.tipEnabled = !!bill.tipEnabled;
    el.tipToggle.checked = state.tipEnabled;
    if (state.tipEnabled) {
      el.tipControls.classList.remove('hidden');
      el.tipIndicator.classList.remove('hidden');
      state.tipRate = bill.tipRate;
      
      const isPreset = [5, 10, 15, 20].includes(bill.tipRate);
      state.isCustomTip = !isPreset;

      el.tipChips.forEach(chip => {
        const val = chip.getAttribute('data-tip');
        if (state.isCustomTip && val === 'custom') {
          chip.classList.add('active');
        } else if (!state.isCustomTip && parseInt(val, 10) === bill.tipRate) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });

      if (state.isCustomTip) {
        el.customTipGroup.classList.remove('hidden');
        el.customTipInput.value = bill.tipRate;
      } else {
        el.customTipGroup.classList.add('hidden');
      }
    } else {
      el.tipControls.classList.add('hidden');
      el.tipIndicator.classList.add('hidden');
    }

    // 4. Conversion
    state.conversionEnabled = !!bill.conversionEnabled;
    el.convertToggle.checked = state.conversionEnabled;
    if (state.conversionEnabled && bill.homeCurrency) {
      state.homeCurrency = bill.homeCurrency;
      state.exchangeRate = bill.exchangeRate || getBenchmarkRate(state.currency, state.homeCurrency);
      state.isCustomRate = true;
      el.homeCurrencySelect.value = state.homeCurrency;
      el.exchangeRateInput.value = state.exchangeRate;
      el.conversionControls.classList.remove('hidden');
      el.conversionIndicator.classList.remove('hidden');
    } else {
      el.conversionControls.classList.add('hidden');
      el.conversionIndicator.classList.add('hidden');
    }

    // 5. Split mode & participants
    setSplitMode(bill.splitMode);

    if (bill.splitMode === 'equal') {
      state.equalPeopleCount = bill.shares.length;
      el.peopleInput.value = bill.shares.length;
      state.equalCustomNames = {};
      bill.shares.forEach((s, idx) => {
        if (s.customName) {
          state.equalCustomNames[idx] = s.customName;
        }
      });
      renderEqualCustomNamesInputs();
    } else {
      state.customParticipants = bill.shares.map((s, idx) => ({
        id: s.id || `p-${idx + 1}`,
        name: s.customName || (s.name.startsWith('Person ') ? '' : s.name),
        amount: (s.shareUnits / factor).toFixed((CURRENCIES[state.currency] || CURRENCIES.INR).decimals),
      }));
      renderCustomParticipantsInputs();
    }

    updateCurrencyUI();
    state.activeCalculation = bill;
    renderCalculationResult(bill);
    saveActiveState();

    el.resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast(`Loaded "${bill.occasion}" into calculator`, 'success');
  }

  // ---------------------------------------------------------------------------
  // 13. LocalStorage Persistence
  // ---------------------------------------------------------------------------
  function saveActiveState() {
    try {
      const dataToSave = {
        currency: state.currency,
        occasion: el.occasionInput.value,
        amountRaw: el.amountInput.value,
        splitMode: state.splitMode,
        equalPeopleCount: state.equalPeopleCount,
        equalCustomNames: state.equalCustomNames,
        customParticipants: state.customParticipants,
        tipEnabled: state.tipEnabled,
        tipRate: state.tipRate,
        isCustomTip: state.isCustomTip,
        customTipValue: el.customTipInput.value,
        conversionEnabled: state.conversionEnabled,
        homeCurrency: state.homeCurrency,
        exchangeRate: state.exchangeRate,
        isCustomRate: state.isCustomRate,
        activeCalculation: state.activeCalculation,
      };
      localStorage.setItem(STORAGE_KEYS.ACTIVE_STATE, JSON.stringify(dataToSave));
    } catch {
      // Ignore quota/private mode errors gracefully
    }
  }

  function saveHistoryState() {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(state.history));
    } catch {
      // Ignore quota/private mode errors gracefully
    }
  }

  function loadPersistedData() {
    // 1. History
    try {
      const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory);
        if (Array.isArray(parsed)) {
          state.history = parsed;
        }
      }
    } catch {
      state.history = [];
    }
    renderHistory();

    // 2. Active state
    try {
      const rawActive = localStorage.getItem(STORAGE_KEYS.ACTIVE_STATE);
      if (rawActive) {
        const saved = JSON.parse(rawActive);
        if (saved && typeof saved === 'object') {
          if (saved.currency && CURRENCIES[saved.currency]) {
            state.currency = saved.currency;
            el.currencySelect.value = state.currency;
          }

          if (saved.occasion !== undefined) el.occasionInput.value = saved.occasion;
          if (saved.amountRaw !== undefined) el.amountInput.value = saved.amountRaw;

          if (saved.splitMode === 'custom' || saved.splitMode === 'equal') {
            state.splitMode = saved.splitMode;
          }

          if (saved.equalPeopleCount && saved.equalPeopleCount >= 1) {
            state.equalPeopleCount = saved.equalPeopleCount;
            el.peopleInput.value = saved.equalPeopleCount;
          }

          if (saved.equalCustomNames && typeof saved.equalCustomNames === 'object') {
            state.equalCustomNames = saved.equalCustomNames;
          }

          if (Array.isArray(saved.customParticipants) && saved.customParticipants.length > 0) {
            state.customParticipants = saved.customParticipants;
          }

          // Tip
          state.tipEnabled = !!saved.tipEnabled;
          el.tipToggle.checked = state.tipEnabled;
          if (state.tipEnabled) {
            el.tipControls.classList.remove('hidden');
            el.tipIndicator.classList.remove('hidden');
          }

          if (typeof saved.tipRate === 'number') state.tipRate = saved.tipRate;
          state.isCustomTip = !!saved.isCustomTip;
          if (saved.customTipValue) el.customTipInput.value = saved.customTipValue;

          el.tipChips.forEach(chip => {
            const val = chip.getAttribute('data-tip');
            if (state.isCustomTip && val === 'custom') {
              chip.classList.add('active');
            } else if (!state.isCustomTip && parseInt(val, 10) === state.tipRate) {
              chip.classList.add('active');
            } else {
              chip.classList.remove('active');
            }
          });

          if (state.isCustomTip) {
            el.customTipGroup.classList.remove('hidden');
          }

          // Conversion
          state.conversionEnabled = !!saved.conversionEnabled;
          el.convertToggle.checked = state.conversionEnabled;
          if (saved.homeCurrency && CURRENCIES[saved.homeCurrency]) {
            state.homeCurrency = saved.homeCurrency;
            el.homeCurrencySelect.value = state.homeCurrency;
          }
          if (saved.exchangeRate) {
            state.exchangeRate = saved.exchangeRate;
            el.exchangeRateInput.value = state.exchangeRate;
          }
          state.isCustomRate = !!saved.isCustomRate;

          if (state.conversionEnabled) {
            el.conversionControls.classList.remove('hidden');
            el.conversionIndicator.classList.remove('hidden');
          }

          setSplitMode(state.splitMode);
          updateCurrencyUI();
          renderEqualCustomNamesInputs();
          renderCustomParticipantsInputs();

          // Restore exact active calculation
          if (saved.activeCalculation && saved.activeCalculation.shares) {
            state.activeCalculation = saved.activeCalculation;
            renderCalculationResult(state.activeCalculation);
          }
        }
      }
    } catch {
      // Ignore corrupted active data
    }
  }

  // ---------------------------------------------------------------------------
  // 14. Split Mode Switching
  // ---------------------------------------------------------------------------
  function setSplitMode(mode) {
    state.splitMode = mode;
    if (mode === 'equal') {
      el.modeEqualBtn.classList.add('active');
      el.modeEqualBtn.setAttribute('aria-checked', 'true');
      el.modeCustomBtn.classList.remove('active');
      el.modeCustomBtn.setAttribute('aria-checked', 'false');

      el.equalSettingsPanel.classList.remove('hidden');
      el.customSettingsPanel.classList.add('hidden');
    } else {
      el.modeCustomBtn.classList.add('active');
      el.modeCustomBtn.setAttribute('aria-checked', 'true');
      el.modeEqualBtn.classList.remove('active');
      el.modeEqualBtn.setAttribute('aria-checked', 'false');

      el.customSettingsPanel.classList.remove('hidden');
      el.equalSettingsPanel.classList.add('hidden');

      synchronizeEqualDataToCustom();
      renderCustomParticipantsInputs();
    }
    saveActiveState();
  }

  function synchronizeEqualDataToCustom() {
    const peopleCount = state.equalPeopleCount;
    const existingCount = state.customParticipants.length;

    if (existingCount < peopleCount) {
      for (let i = existingCount; i < peopleCount; i++) {
        const name = (state.equalCustomNames[i] || '').trim();
        state.customParticipants.push({
          id: `p-${Date.now()}-${i + 1}`,
          name: name,
          amount: '',
        });
      }
    }

    const totalUnits = toIntegerUnits(parseFloat(el.amountInput.value) || 0, state.currency);
    const hasAnyCustomAmount = state.customParticipants.some(p => p.amount && parseFloat(p.amount) > 0);
    if (totalUnits > 0 && !hasAnyCustomAmount && state.customParticipants.length > 0) {
      autoBalanceEvenly();
    }
  }

  function autoBalanceEvenly() {
    const currency = state.currency;
    const originalUnits = toIntegerUnits(parseFloat(el.amountInput.value) || 0, currency);
    let tipUnits = 0;
    if (state.tipEnabled) {
      const tipRate = state.isCustomTip ? (parseFloat(el.customTipInput.value) || 0) : state.tipRate;
      tipUnits = Math.round((originalUnits * tipRate) / 100);
    }
    const targetUnits = originalUnits + tipUnits;
    const count = state.customParticipants.length;

    if (count === 0 || targetUnits <= 0) return;

    const baseUnits = Math.floor(targetUnits / count);
    const remainder = targetUnits % count;
    const factor = (CURRENCIES[currency] || CURRENCIES.INR).decimals === 0 ? 1 : 100;

    state.customParticipants.forEach((p, idx) => {
      const shareUnits = idx < remainder ? baseUnits + 1 : baseUnits;
      p.amount = (shareUnits / factor).toFixed((CURRENCIES[currency] || CURRENCIES.INR).decimals);
    });

    renderCustomParticipantsInputs();
    updateCustomBalanceMonitor();
    saveActiveState();
  }

  // ---------------------------------------------------------------------------
  // 15. Copy & Share Functionality
  // ---------------------------------------------------------------------------
  function generateShareSummaryText(calc) {
    if (!calc) return '';
    const billCurr = calc.currency || state.currency;

    let text = `Billable.co — ${calc.occasion}\n`;
    text += `Original bill: ${formatMoney(calc.originalAmountUnits, billCurr)}\n`;
    if (calc.tipEnabled && calc.tipUnits > 0) {
      text += `Tip: ${formatMoney(calc.tipUnits, billCurr)} (${calc.tipRate}%)\n`;
    } else {
      text += `Tip: ${formatMoney(0, billCurr)}\n`;
    }

    if (calc.conversionEnabled && calc.homeCurrency) {
      text += `Final total: ${formatMoney(calc.finalTotalUnits, billCurr)} (≈ ${formatMoney(calc.convertedTotalUnits, calc.homeCurrency)} @ 1 ${billCurr} = ${calc.exchangeRate} ${calc.homeCurrency})\n\n`;
      calc.shares.forEach(p => {
        text += `${p.name}: ${formatMoney(p.shareUnits, billCurr)} (≈ ${formatMoney(p.convertedShareUnits, calc.homeCurrency)})\n`;
      });
    } else {
      text += `Final total: ${formatMoney(calc.finalTotalUnits, billCurr)}\n\n`;
      calc.shares.forEach(p => {
        text += `${p.name}: ${formatMoney(p.shareUnits, billCurr)}\n`;
      });
    }

    text += `\nTotal contributions: ${formatMoney(calc.totalSharesUnits, billCurr)}`;
    return text;
  }

  function copyBillToClipboard() {
    if (!state.activeCalculation) {
      showToast('No active calculation to copy', 'error');
      return;
    }

    const textToCopy = generateShareSummaryText(state.activeCalculation);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          showToast('Bill breakdown copied to clipboard!', 'success');
        })
        .catch(() => {
          fallbackCopyToClipboard(textToCopy);
        });
    } else {
      fallbackCopyToClipboard(textToCopy);
    }
  }

  function fallbackCopyToClipboard(text) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        showToast('Bill breakdown copied to clipboard!', 'success');
      } else {
        showToast('Could not access clipboard', 'error');
      }
    } catch {
      showToast('Could not access clipboard', 'error');
    }
  }

  function shareBill() {
    if (!state.activeCalculation) {
      showToast('No active calculation to share', 'error');
      return;
    }

    const shareText = generateShareSummaryText(state.activeCalculation);
    const title = `billable.co — ${state.activeCalculation.occasion}`;

    if (navigator.share) {
      navigator.share({
        title: title,
        text: shareText,
      })
      .then(() => {
        showToast('Shared successfully!', 'success');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          copyBillToClipboard();
        }
      });
    } else {
      copyBillToClipboard();
    }
  }

  // ---------------------------------------------------------------------------
  // 16. Form Reset & New Bill
  // ---------------------------------------------------------------------------
  function resetBillForm() {
    clearErrors();
    el.occasionInput.value = '';
    el.amountInput.value = '';
    el.peopleInput.value = '3';
    state.equalPeopleCount = 3;
    state.equalCustomNames = {};
    state.customParticipants = [
      { id: 'p-1', name: '', amount: '' },
      { id: 'p-2', name: '', amount: '' },
      { id: 'p-3', name: '', amount: '' },
    ];

    state.tipEnabled = false;
    el.tipToggle.checked = false;
    el.tipControls.classList.add('hidden');
    el.tipIndicator.classList.add('hidden');
    state.tipRate = 10;
    state.isCustomTip = false;
    el.customTipGroup.classList.add('hidden');
    el.customTipInput.value = '10';

    el.tipChips.forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-tip') === '10');
    });

    setSplitMode('equal');
    updateCurrencyUI();
    renderEqualCustomNamesInputs();
    renderCustomParticipantsInputs();
    updateTipPreview();

    state.activeCalculation = null;
    renderCalculationResult(null);
    saveActiveState();
    el.occasionInput.focus();
  }

  function startNewBill() {
    resetBillForm();
    showToast('Started fresh bill. Previous history preserved.', 'success');
  }

  // ---------------------------------------------------------------------------
  // 17. Event Bindings
  // ---------------------------------------------------------------------------
  function initEventListeners() {
    // Currency Selector Dropdown in Header
    el.currencySelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (CURRENCIES[selected]) {
        state.currency = selected;
        state.isCustomRate = false; // Reset to benchmark for new currency pair
        updateCurrencyUI();
        saveActiveState();
        showToast(`Switched currency to ${selected} (${CURRENCIES[selected].symbol})`, 'success');
      }
    });

    // Home Currency Selector
    el.homeCurrencySelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (CURRENCIES[selected]) {
        state.homeCurrency = selected;
        state.isCustomRate = false;
        state.exchangeRate = getBenchmarkRate(state.currency, state.homeCurrency);
        el.exchangeRateInput.value = state.exchangeRate;
        updateCurrencyUI();
        saveActiveState();
      }
    });

    // Conversion Toggle
    el.convertToggle.addEventListener('change', (e) => {
      state.conversionEnabled = e.target.checked;
      el.conversionControls.classList.toggle('hidden', !state.conversionEnabled);
      el.conversionIndicator.classList.toggle('hidden', !state.conversionEnabled);
      updateCurrencyUI();
      saveActiveState();
    });

    // Exchange Rate Input
    el.exchangeRateInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (val && val > 0) {
        state.exchangeRate = val;
        state.isCustomRate = true;
        updateConversionPreview();
        saveActiveState();
      }
    });

    // Reset Exchange Rate
    el.btnResetRate.addEventListener('click', () => {
      state.isCustomRate = false;
      state.exchangeRate = getBenchmarkRate(state.currency, state.homeCurrency);
      el.exchangeRateInput.value = state.exchangeRate;
      updateConversionPreview();
      saveActiveState();
      showToast('Exchange rate reset to standard benchmark', 'success');
    });

    // Form submission
    el.form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!validateInputs()) {
        state.activeCalculation = null;
        renderCalculationResult(null);
        saveActiveState();
        return;
      }

      const result = calculateBill();
      state.activeCalculation = result;

      renderCalculationResult(result);
      saveToHistory(result);
      saveActiveState();
      showToast('Bill split successfully!', 'success');

      if (window.innerWidth <= 960) {
        el.resultCard.scrollIntoView({ behavior: 'smooth' });
      }
    });

    // Occasion quick chips
    document.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        if (preset) {
          el.occasionInput.value = preset;
          el.occasionInput.focus();
          clearErrors();
          saveActiveState();
        }
      });
    });

    el.occasionInput.addEventListener('input', () => {
      clearErrors();
      saveActiveState();
    });

    el.amountInput.addEventListener('input', () => {
      clearErrors();
      updateTipPreview();
      updateConversionPreview();
      if (state.splitMode === 'custom') {
        updateCustomBalanceMonitor();
      }
      saveActiveState();
    });

    // Split mode toggle
    el.modeEqualBtn.addEventListener('click', () => {
      setSplitMode('equal');
      clearErrors();
    });

    el.modeCustomBtn.addEventListener('click', () => {
      setSplitMode('custom');
      clearErrors();
    });

    // Participant count stepper
    el.btnDecrementPeople.addEventListener('click', () => {
      let count = parseInt(el.peopleInput.value, 10) || 1;
      if (count > 1) {
        count -= 1;
        el.peopleInput.value = count;
        state.equalPeopleCount = count;
        renderEqualCustomNamesInputs();
        clearErrors();
        saveActiveState();
      }
    });

    el.btnIncrementPeople.addEventListener('click', () => {
      let count = parseInt(el.peopleInput.value, 10) || 1;
      if (count < 100) {
        count += 1;
        el.peopleInput.value = count;
        state.equalPeopleCount = count;
        renderEqualCustomNamesInputs();
        clearErrors();
        saveActiveState();
      }
    });

    el.peopleInput.addEventListener('input', () => {
      const count = parseInt(el.peopleInput.value, 10);
      if (count && count >= 1 && count <= 100) {
        state.equalPeopleCount = count;
        renderEqualCustomNamesInputs();
        clearErrors();
        saveActiveState();
      }
    });

    // Names accordion toggle
    el.btnToggleNames.addEventListener('click', () => {
      const isExpanded = el.btnToggleNames.getAttribute('aria-expanded') === 'true';
      el.btnToggleNames.setAttribute('aria-expanded', !isExpanded);
      el.btnToggleNames.classList.toggle('active', !isExpanded);
      el.namesContainer.classList.toggle('hidden', isExpanded);
    });

    // Custom Mode: Add Participant
    el.btnAddPerson.addEventListener('click', () => {
      const newIndex = state.customParticipants.length + 1;
      state.customParticipants.push({
        id: `p-${Date.now()}-${newIndex}`,
        name: '',
        amount: '',
      });
      renderCustomParticipantsInputs();
      saveActiveState();
    });

    // Custom Mode: Auto Balance
    el.btnAutoBalance.addEventListener('click', () => {
      autoBalanceEvenly();
    });

    // Tip Toggle
    el.tipToggle.addEventListener('change', (e) => {
      state.tipEnabled = e.target.checked;
      el.tipControls.classList.toggle('hidden', !state.tipEnabled);
      el.tipIndicator.classList.toggle('hidden', !state.tipEnabled);
      updateTipPreview();
      updateConversionPreview();
      if (state.splitMode === 'custom') {
        updateCustomBalanceMonitor();
      }
      saveActiveState();
    });

    // Tip Chips
    el.tipChips.forEach(chip => {
      chip.addEventListener('click', () => {
        el.tipChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const tipVal = chip.getAttribute('data-tip');
        if (tipVal === 'custom') {
          state.isCustomTip = true;
          el.customTipGroup.classList.remove('hidden');
          el.customTipInput.focus();
        } else {
          state.isCustomTip = false;
          state.tipRate = parseInt(tipVal, 10);
          el.customTipGroup.classList.add('hidden');
        }

        updateTipPreview();
        updateConversionPreview();
        if (state.splitMode === 'custom') {
          updateCustomBalanceMonitor();
        }
        saveActiveState();
      });
    });

    el.customTipInput.addEventListener('input', () => {
      updateTipPreview();
      updateConversionPreview();
      if (state.splitMode === 'custom') {
        updateCustomBalanceMonitor();
      }
      saveActiveState();
    });

    // Action buttons
    el.btnResetForm.addEventListener('click', resetBillForm);
    el.btnNewBill.addEventListener('click', startNewBill);
    el.btnCopyBill.addEventListener('click', copyBillToClipboard);
    el.btnShareBill.addEventListener('click', shareBill);

    // History Clear Confirmations
    el.btnClearHistory.addEventListener('click', () => {
      el.clearConfirmPanel.classList.remove('hidden');
    });

    el.btnConfirmClear.addEventListener('click', clearAllHistory);
    el.btnCancelClear.addEventListener('click', () => {
      el.clearConfirmPanel.classList.add('hidden');
    });
  }

  // ---------------------------------------------------------------------------
  // 18. App Initialization
  // ---------------------------------------------------------------------------
  function init() {
    renderEqualCustomNamesInputs();
    renderCustomParticipantsInputs();
    initEventListeners();
    loadPersistedData();
    updateCurrencyUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
