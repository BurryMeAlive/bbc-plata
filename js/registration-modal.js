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
        separateDialCode: false,
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
      });
      
      phoneInput.addEventListener('input', () => {
        this.clearFieldError(phoneInput);
      });
      
      phoneInput.addEventListener('blur', () => {
        if (phoneInput.value.trim()) {
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
          phoneInput.placeholder = exampleNumber;
        } else {
          phoneInput.placeholder = 'Введите номер телефона';
        }
      } else {
        phoneInput.placeholder = 'Введите номер телефона';
      }
    } catch (error) {
      console.error('Error updating phone placeholder:', error);
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
      phone: {
        presence: {
          message: "Номер телефона обязателен для заполнения"
        },
        length: {
          minimum: 10,
          message: "Номер телефона должен содержать минимум 10 цифр"
        }
        // Phone validation will be added later as requested
      }
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
    
    if (!phoneValue) {
      this.showFieldError(phoneInput, 'Номер телефона обязателен');
      phoneInput.classList.add('error');
      return false;
    }
    
    if (this.phoneInputInstance.isValidNumber()) {
      this.clearFieldError(phoneInput);
      phoneInput.classList.remove('error');
      return true;
    } else {
      this.showFieldError(phoneInput, 'Неверный формат номера телефона');
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
  
  handleSubmit() {
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
    
    // Collect form data
    const formData = new FormData(this.form);
    
    // Get international phone number if available
    let phoneNumber = formData.get('phone');
    if (this.phoneInputInstance) {
      phoneNumber = this.phoneInputInstance.getNumber(); // Full international format
    }
    
    const userData = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      phone: phoneNumber,
      phoneCountry: this.phoneInputInstance ? this.phoneInputInstance.getSelectedCountryData().name : '',
      ip: this.userIP,
      country: this.userCountry,
      timestamp: new Date().toISOString()
    };
    
    console.log('Registration data:', userData);
    
    // Show success message
    toastr.success('Регистрация успешно завершена!', 'Успех');
    
    // Close modal after short delay
    setTimeout(() => {
      this.closeModal();
    }, 2000);
    
    // Here you would normally send the data to your server
    // await this.sendRegistrationData(userData);
  }
  
  // Future method for sending data to server
  async sendRegistrationData(userData) {
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Registration successful:', result);
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toastr.error('Произошла ошибка при регистрации. Попробуйте еще раз.');
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
      border-radius: 8px;
    }
    .toast-success {
      background-color: #28a745;
    }
    .toast-error {
      background-color: #dc3545;
    }
  `;
  document.head.appendChild(style);
});