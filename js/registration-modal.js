// CRM Configuration
const CRM_CONFIG = {
  endpoint: 'https://crm.lead-cosmetology.site/api/leads',
  source: 'Motorola',
  defaultUserId: '14',
  landingName: 'test', // Нужно будет указать правильное название воронки
  description: 'Заявка с лендинга PLATA'
};

// Registration Modal JavaScript
class RegistrationModal {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 4;
    this.userIP = null;
    this.userCountry = null;
    this.phoneInputInstance = null;
    this.modal = document.getElementById('registrationModal');
    this.form = document.getElementById('registrationForm');
    
    this.init();
  }
  
  init() {
    // Get user IP on page load
    this.getUserIP();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup validation rules
    this.setupValidation();
    
    // Configure toastr
    this.configureToastr();
  }
  
  async getUserIP() {
    try {
      const response = await fetch('https://get.geojs.io/v1/ip/geo.json');
      const data = await response.json();
      this.userIP = data.ip;
      this.userCountry = data.country_code ? data.country_code.toLowerCase() : 'de';
      console.log('User IP:', this.userIP, 'Country:', this.userCountry);
      
      // Initialize phone input after getting country
      await this.initPhoneInput();
    } catch (error) {
      console.error('Error getting user IP:', error);
      // Fallback to alternative service
      try {
        const response = await fetch('https://get.geojs.io/v1/ip.json');
        const data = await response.json();
        this.userIP = data.ip;
        this.userCountry = 'de'; // Default fallback
        console.log('User IP (fallback):', this.userIP);
        
        // Initialize phone input with fallback country
        await this.initPhoneInput();
      } catch (fallbackError) {
        console.error('Error getting user IP (fallback):', fallbackError);
        this.userCountry = 'de'; // Final fallback
        await this.initPhoneInput();
      }
    }
  }
  
  async initPhoneInput() {
    const phoneInput = document.getElementById('phone');
    if (!phoneInput || this.phoneInputInstance) return;
    
    // Wait for intl-tel-input to be available
    if (typeof window.intlTelInput === 'undefined') {
      setTimeout(() => this.initPhoneInput(), 100);
      return;
    }
    
    try {
      // Find the form-group container for the phone input
      const phoneFormGroup = phoneInput.closest('.form-group');
      
      this.phoneInputInstance = window.intlTelInput(phoneInput, {
        initialCountry: this.userCountry || 'de',
        preferredCountries: [this.userCountry || 'de', 'de', 'us', 'gb', 'ru'],
        separateDialCode: true, // Показывать региональный код отдельно
        showSearchBox: false,
        useFullscreenPopup: false,
        dropdownContainer: phoneFormGroup,
        countrySearch: false,
        utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@21.0.8/build/js/utils.js"
      });
      
      // Set placeholder based on country
      this.updatePhonePlaceholder();
      
      // Fix dropdown positioning within modal
      setTimeout(() => {
        const dropdown = phoneInput.parentElement.querySelector('.iti__country-list');
        if (dropdown) {
          dropdown.style.position = 'absolute';
          dropdown.style.zIndex = '10001';
          dropdown.style.width = '100%';
        }
      }, 100);
      
      // Add event listeners
      phoneInput.addEventListener('countrychange', () => {
        this.updatePhonePlaceholder();
        this.clearFieldError(phoneInput);
        phoneInput.classList.remove('error');
        
        // Перепроверяем номер после смены страны
        const currentValue = phoneInput.value.trim();
        if (currentValue.length > 0) {
          setTimeout(() => {
            this.validatePhoneField();
          }, 100); // Небольшая задержка для обновления контрола
        }
      });
      
      phoneInput.addEventListener('input', () => {
        // Очищаем ошибки при вводе
        this.clearFieldError(phoneInput);
        
        // Проверяем в реальном времени для длинных номеров
        const currentValue = phoneInput.value.trim();
        if (currentValue.length >= 7) { // Минимальная длина для проверки
          setTimeout(() => {
            if (this.phoneInputInstance && this.phoneInputInstance.isValidNumber()) {
              this.clearFieldError(phoneInput);
              phoneInput.classList.remove('error');
            }
          }, 300); // Небольшая задержка для стабильности
        }
      });
      
      phoneInput.addEventListener('blur', () => {
        // Проверяем при потере фокуса, если что-то введено
        const currentValue = phoneInput.value.trim();
        if (currentValue.length > 0) {
          this.validatePhoneField();
        }
      });
      
      // Handle dropdown open/close events
      const selectedFlag = phoneInput.parentElement.querySelector('.iti__selected-flag');
      if (selectedFlag) {
        selectedFlag.addEventListener('click', () => {
          const phoneFormGroup = phoneInput.closest('.form-group');
          
          setTimeout(() => {
            const dropdown = phoneFormGroup.querySelector('.iti__country-list');
            const itiContainer = phoneInput.parentElement.querySelector('.iti');
            
            if (dropdown && dropdown.style.display !== 'none') {
              // Dropdown is opening
              phoneFormGroup.classList.add('phone-input-active');
              dropdown.style.position = 'absolute';
              dropdown.style.zIndex = '10001';
              dropdown.style.width = '100%';
              dropdown.style.maxHeight = '200px';
              dropdown.style.overflowY = 'auto';
            } else {
              // Dropdown is closing
              phoneFormGroup.classList.remove('phone-input-active');
            }
          }, 10);
        });
      }
      
      // Handle clicks outside to close dropdown
      document.addEventListener('click', (e) => {
        const phoneFormGroup = phoneInput.closest('.form-group');
        if (!phoneFormGroup.contains(e.target)) {
          phoneFormGroup.classList.remove('phone-input-active');
        }
      });
      
      console.log('Phone input initialized successfully');
    } catch (error) {
      console.error('Error initializing phone input:', error);
    }
  }
  
  updatePhonePlaceholder() {
    if (!this.phoneInputInstance) return;
    
    try {
      const phoneInput = document.getElementById('phone');
      const countryData = this.phoneInputInstance.getSelectedCountryData();
      
      // Get example number for the selected country
      if (window.intlTelInputUtils && countryData.iso2) {
        const exampleNumber = window.intlTelInputUtils.getExampleNumber(
          countryData.iso2.toUpperCase(),
          false,
          window.intlTelInputUtils.numberFormat.NATIONAL
        );
        
        if (exampleNumber) {
          // Убираем региональный код из placeholder (например, убираем +370 из "+370 123 45678")
          let nationalExample = exampleNumber;
          
          // Получаем региональный код
          const dialCode = countryData.dialCode;
          
          // Убираем региональный код из примера
          if (nationalExample.startsWith('+' + dialCode)) {
            nationalExample = nationalExample.substring(('+' + dialCode).length).trim();
          } else if (nationalExample.startsWith(dialCode)) {
            nationalExample = nationalExample.substring(dialCode.length).trim();
          }
          
          // Убираем ведущие нули и лишние символы
          nationalExample = nationalExample.replace(/^[\s\-\(\)0]+/, '');
          
          phoneInput.placeholder = nationalExample || 'Введите номер телефона';
        } else {
          phoneInput.placeholder = 'Введите номер телефона';
        }
      } else {
        phoneInput.placeholder = 'Введите номер телефона';
      }
    } catch (error) {
      console.error('Error updating phone placeholder:', error);
      // Fallback placeholder
      const phoneInput = document.getElementById('phone');
      if (phoneInput) {
        phoneInput.placeholder = 'Введите номер телефона';
      }
    }
  }
  
  // Get user_id from URL parameters or use default
  getUserIdFromUrl() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get('user_id') || urlParams.get('uid') || urlParams.get('buyer_id');
      return userId || CRM_CONFIG.defaultUserId;
    } catch (e) {
      console.warn('Failed to get user_id from URL:', e);
      return CRM_CONFIG.defaultUserId;
    }
  }
  
  // Get country name from phone input instance
  getCountryFromPhoneInput() {
    try {
      if (this.phoneInputInstance && this.phoneInputInstance.getSelectedCountryData) {
        const countryData = this.phoneInputInstance.getSelectedCountryData();
        return countryData && countryData.name ? countryData.name : 'Germany';
      }
      return 'Germany';
    } catch (e) {
      console.warn('Failed to get country from phone input:', e);
      return 'Germany';
    }
  }
  
  // Format phone number for CRM (remove + sign)
  formatPhoneForCRM(phoneNumber) {
    if (!phoneNumber) return '';
    return phoneNumber.replace(/^\+/, '').replace(/\s+/g, '');
  }
  
  // Send lead to CRM
  async sendLeadToCRM(leadData) {
    try {
      console.log('Отправляем в CRM:', leadData);
      
      // Convert to URLSearchParams for application/x-www-form-urlencoded
      const formData = new URLSearchParams();
      Object.keys(leadData).forEach(key => {
        if (leadData[key] !== null && leadData[key] !== undefined) {
          formData.append(key, leadData[key]);
        }
      });
      
      const response = await fetch(CRM_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: formData
      });
      
      const responseText = await response.text();
      console.log('CRM ответ (raw):', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.warn('Ошибка парсинга JSON:', parseError);
        responseData = { raw: responseText };
      }
      
      if (!response.ok) {
        console.error('CRM error:', response.status, responseData);
        return { 
          success: false, 
          status: response.status, 
          data: responseData,
          error: `HTTP ${response.status}: ${response.statusText}` 
        };
      }
      
      console.log('✅ CRM success:', responseData);
      return { 
        success: true, 
        status: response.status, 
        data: responseData 
      };
      
    } catch (error) {
      console.error('Ошибка CRM запроса:', error);
      return { 
        success: false, 
        status: 0, 
        error: error.message || 'Ошибка соединения' 
      };
    }
  }
  
  setupEventListeners() {
    // Modal open buttons
    const modalButtons = document.querySelectorAll('.form__title');
    modalButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal();
      });
    });
    
    // Modal close
    const closeBtn = document.querySelector('.close');
    closeBtn.addEventListener('click', () => {
      this.closeModal();
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target === this.modal) {
        this.closeModal();
      }
    });
    
    // Form submission
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
    
    // Input validation on blur
    const inputs = this.form.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        this.validateField(input);
      });
      
      input.addEventListener('input', () => {
        this.clearFieldError(input);
      });
    });
  }
  
  setupValidation() {
    // Validation constraints
    this.constraints = {
      firstName: {
        presence: {
          message: "Имя обязательно для заполнения"
        },
        length: {
          minimum: 2,
          maximum: 50,
          message: "Имя должно содержать от 2 до 50 символов"
        },
        format: {
          pattern: /^[а-яёА-ЯЁa-zA-Z\s-]+$/,
          message: "Имя может содержать только буквы, пробелы и дефисы"
        }
      },
      lastName: {
        presence: {
          message: "Фамилия обязательна для заполнения"
        },
        length: {
          minimum: 2,
          maximum: 50,
          message: "Фамилия должна содержать от 2 до 50 символов"
        },
        format: {
          pattern: /^[а-яёА-ЯЁa-zA-Z\s-]+$/,
          message: "Фамилия может содержать только буквы, пробелы и дефисы"
        }
      },
      email: {
        presence: {
          message: "Email обязателен для заполнения"
        },
        email: {
          message: "Введите корректный email адрес"
        }
      },
      // Телефон валидируется отдельно через intl-tel-input
    };
  }
  
  configureToastr() {
    // Configure toastr notifications
    toastr.options = {
      closeButton: true,
      debug: false,
      newestOnTop: false,
      progressBar: true,
      positionClass: "toast-top-right",
      preventDuplicates: false,
      onclick: null,
      showDuration: "300",
      hideDuration: "1000",
      timeOut: "5000",
      extendedTimeOut: "1000",
      showEasing: "swing",
      hideEasing: "linear",
      showMethod: "fadeIn",
      hideMethod: "fadeOut"
    };
  }
  
  openModal() {
    this.modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Reset form to first step
    this.currentStep = 1;
    this.updateProgress();
    this.showStep(this.currentStep);
    
    // Clear all errors and form data
    this.clearAllErrors();
    this.form.reset();
    
    // Reinitialize phone input if not already initialized
    if (!this.phoneInputInstance) {
      setTimeout(() => this.initPhoneInput(), 100);
    } else {
      // Update placeholder for existing instance
      this.updatePhonePlaceholder();
    }
  }
  
  closeModal() {
    this.modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
  
  nextStep() {
    const currentInput = this.getCurrentStepInput();
    
    if (this.validateField(currentInput)) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.updateProgress();
        this.showStep(this.currentStep);
      }
    }
  }
  
  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateProgress();
      this.showStep(this.currentStep);
    }
  }
  
  getCurrentStepInput() {
    const currentStepDiv = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
    if (currentStepDiv) {
      const input = currentStepDiv.querySelector('input');
      return input;
    }
    return null;
  }
  
  updateProgress() {
    const progressBar = document.getElementById('progressBar');
    const progressWidth = (this.currentStep / this.totalSteps) * 100;
    progressBar.style.width = progressWidth + '%';
    
    // Update step indicators
    const steps = document.querySelectorAll('.step');
    
    steps.forEach((step, index) => {
      const stepNumber = index + 1;
      const titleElement = step.querySelector('.title');
      
      step.classList.remove('active', 'completed');
      
      if (stepNumber < this.currentStep) {
        step.classList.add('completed');
        if (titleElement) {
          titleElement.textContent = '✓';
        }
      } else if (stepNumber === this.currentStep) {
        step.classList.add('active');
        if (titleElement) {
          titleElement.textContent = stepNumber;
        }
      } else {
        if (titleElement) {
          titleElement.textContent = stepNumber;
        }
      }
    });
  }
  
  showStep(stepNumber) {
    const steps = document.querySelectorAll('.form-step');
    
    steps.forEach((step, index) => {
      step.classList.remove('active');
      if (index + 1 === stepNumber) {
        step.classList.add('active');
      }
    });
  }
  
  validateField(input) {
    if (!input) {
      return false;
    }
    
    const fieldName = input.name;
    const fieldValue = input.value.trim();
    
    // Phone validation using intl-tel-input
    if (fieldName === 'phone') {
      return this.validatePhoneField();
    }
    
    // Simple validation for other fields
    if (fieldValue.length === 0) {
      this.showFieldError(input, 'Поле обязательно для заполнения');
      return false;
    }
    
    if (fieldValue.length < 2) {
      this.showFieldError(input, 'Минимум 2 символа');
      return false;
    }
    
    if (fieldName === 'email' && !fieldValue.includes('@')) {
      this.showFieldError(input, 'Введите корректный email');
      return false;
    }
    
    this.clearFieldError(input);
    return true;
  }
  
  validatePhoneField() {
    const phoneInput = document.getElementById('phone');
    if (!phoneInput || !this.phoneInputInstance) {
      return false;
    }
    
    const phoneValue = phoneInput.value.trim();
    
    // Проверяем, что поле не пустое
    if (!phoneValue) {
      this.showFieldError(phoneInput, 'Номер телефона обязателен');
      phoneInput.classList.add('error');
      return false;
    }
    
    // Проверяем минимальную длину (только для национальной части)
    if (phoneValue.length < 3) {
      this.showFieldError(phoneInput, 'Номер слишком короткий');
      phoneInput.classList.add('error');
      return false;
    }
    
    try {
      // Используем встроенную валидацию intl-tel-input
      // Она проверяет полный номер (национальная часть + региональный код)
      const isValid = this.phoneInputInstance.isValidNumber();
      
      if (isValid) {
        this.clearFieldError(phoneInput);
        phoneInput.classList.remove('error');
        return true;
      } else {
        // Получаем более конкретное сообщение об ошибке
        let errorMessage = 'Неверный формат номера телефона';
        
        // Проверяем тип ошибки с помощью utils (if available)
        if (window.intlTelInputUtils && this.phoneInputInstance.getValidationError) {
          const errorCode = this.phoneInputInstance.getValidationError();
          const errorMap = [
            'Неверный номер', // INVALID_NUMBER
            'Неверный код страны', // INVALID_COUNTRY_CODE  
            'Номер слишком короткий', // TOO_SHORT
            'Номер слишком длинный', // TOO_LONG
            'Неверный номер' // INVALID_NUMBER (fallback)
          ];
          
          if (errorCode >= 0 && errorCode < errorMap.length) {
            errorMessage = errorMap[errorCode];
          }
        }
        
        this.showFieldError(phoneInput, errorMessage);
        phoneInput.classList.add('error');
        return false;
      }
    } catch (error) {
      console.error('Phone validation error:', error);
      this.showFieldError(phoneInput, 'Ошибка проверки номера');
      phoneInput.classList.add('error');
      return false;
    }
  }
  
  showFieldError(input, message) {
    input.classList.add('error');
    
    // Special handling for phone input with intl-tel-input
    if (input.name === 'phone' && this.phoneInputInstance) {
      const itiContainer = input.parentElement.querySelector('.iti');
      if (itiContainer) {
        itiContainer.classList.add('iti--error');
      }
    }
    
    const errorDiv = document.getElementById(input.name + 'Error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.classList.add('show');
    }
  }
  
  clearFieldError(input) {
    input.classList.remove('error');
    
    // Special handling for phone input with intl-tel-input
    if (input.name === 'phone' && this.phoneInputInstance) {
      const itiContainer = input.parentElement.querySelector('.iti');
      if (itiContainer) {
        itiContainer.classList.remove('iti--error');
      }
    }
    
    const errorDiv = document.getElementById(input.name + 'Error');
    if (errorDiv) {
      errorDiv.textContent = '';
      errorDiv.classList.remove('show');
    }
  }
  
  clearAllErrors() {
    const inputs = this.form.querySelectorAll('input');
    inputs.forEach(input => {
      this.clearFieldError(input);
    });
  }
  
  async handleSubmit() {
    // Validate all fields including phone
    let isValid = true;
    const inputs = this.form.querySelectorAll('input');
    
    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });
    
    if (!isValid) {
      toastr.error('Пожалуйста, исправьте ошибки в форме');
      return;
    }
    
    // Show loading state
    const submitBtn = this.form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span style="opacity: 0.7;">Отправка...</span>';
    
    try {
      // Collect form data
      const formData = new FormData(this.form);
      
      // Get international phone number if available
      let phoneNumber = formData.get('phone');
      if (this.phoneInputInstance) {
        phoneNumber = this.phoneInputInstance.getNumber(); // Full international format
      }
      
      // Prepare CRM payload according to the specification
      const crmPayload = {
        full_name: `${formData.get('firstName')} ${formData.get('lastName')}`.trim(),
        country: this.getCountryFromPhoneInput(),
        email: formData.get('email'),
        landing: window.location.href,
        phone: this.formatPhoneForCRM(phoneNumber), // Without + sign
        user_id: this.getUserIdFromUrl(),
        ip: this.userIP || '',
        source: CRM_CONFIG.source,
        landing_name: CRM_CONFIG.landingName,
        description: CRM_CONFIG.description
      };
      
      console.log('Отправляемые данные:', crmPayload);
      
      // Send to CRM
      const result = await this.sendLeadToCRM(crmPayload);
      
      // Restore button state
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      
      // Close modal first
      this.closeModal();
      
      // Then show appropriate toast
      if (result.success) {
        // Success toast
        toastr.success('✅ Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.', 'Успех', {
          timeOut: 6000,
          closeButton: true,
          progressBar: true
        });
        
        // Reset form
        this.form.reset();
        this.clearAllErrors();
        
        // Log successful submission
        if (result.data) {
          console.log('✅ Lead ID:', result.data.lead_id || result.data.external_id);
          if (result.data.link_auto_login) {
            console.log('🔗 Auto login link:', result.data.link_auto_login);
          }
        }
        
      } else {
        // Error toast
        let errorMessage = '❌ Произошла ошибка при отправке заявки.';
        
        // Check for specific error messages
        if (result.data && typeof result.data === 'object') {
          if (result.data.message) {
            errorMessage = `❌ ${result.data.message}`;
          } else if (result.data.raw && result.data.raw.includes('offers not found')) {
            errorMessage = '❌ Предложение не найдено. Попробуйте позже.';
          }
        } else if (result.error) {
          errorMessage = `❌ ${result.error}`;
        }
        
        toastr.error(errorMessage, 'Ошибка', {
          timeOut: 7000,
          closeButton: true,
          progressBar: true
        });
      }
      
    } catch (error) {
      console.error('Ошибка при отправке формы:', error);
      
      // Restore button state
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      
      // Close modal
      this.closeModal();
      
      // Show error toast
      toastr.error('⚠️ Произошла ошибка соединения. Проверьте интернет-соединение и попробуйте снова.', 'Ошибка', {
        timeOut: 7000,
        closeButton: true,
        progressBar: true
      });
    }
  }
}

// Global functions for inline onclick handlers
function nextStep() {
  if (window.registrationModal) {
    window.registrationModal.nextStep();
  }
}

function prevStep() {
  if (window.registrationModal) {
    window.registrationModal.prevStep();
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  window.registrationModal = new RegistrationModal();
});

// Toastr styling override
document.addEventListener('DOMContentLoaded', function() {
  const style = document.createElement('style');
  style.textContent = `
    .toast-top-right {
      top: 20px;
      right: 20px;
    }
    .toast {
      border-radius: 10px;
      font-family: inherit;
      font-size: 16px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
      min-height: 60px;
    }
    .toast-success {
      background: linear-gradient(135deg, #28a745, #20c997);
      color: white;
    }
    .toast-error {
      background: linear-gradient(135deg, #dc3545, #fd7e14);
      color: white;
    }
    .toast-progress {
      background-color: rgba(255, 255, 255, 0.3);
    }
    .toast-close-button {
      color: white;
      opacity: 0.8;
    }
    .toast-close-button:hover {
      opacity: 1;
    }
    /* Custom animation */
    .toast {
      animation: slideInRight 0.3s ease-out;
    }
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
});
