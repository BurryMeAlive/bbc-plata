import {
  generationsCustomPassword,
  validPhoneNumber,
  getParramUtm,
  commentVal,
  thenkYouPage,
  generationsModalErrors,
  renderFormRegistrations,
  validEmail,
  preloaderFormSend,
  addLoader,
  regValidatorInputText,
  removeLoader,
} from "./functions.js";

import {
  postToGoogle
} from '../../../users/google.js';



renderFormRegistrations("_main-form");
generationsModalErrors();

const errorItiMap = [
  "Invalid number",
  "Invalid country code",
  "Too short",
  "Too long",
  "Invalid number",
];

const settingObjForm = {
  postParams: {
    first_name: null,
    last_name: null,
    email: null,
    phone: null,
    country_code: 'US',
    comment: null,
    respons: null,
    offerName: 'PlataProkl',
    _setParams: function (answers) {
      this.first_name = document.querySelector('input[name="name"]').value;
      this.last_name = document.querySelector('input[name="last_name"]').value;
      this.email = document.querySelector('input[name="email"]').value;
      // this.country_code = document.querySelector('input[name="code"]').value;
      this.comment = commentVal(answers);
    },
  },
};

const codeCountry = document.querySelectorAll('input[name="code"]');
const lastNameG = document.querySelectorAll('input[name="last_name"]'),
  firstNameG = document.querySelectorAll('input[name="name"]'),
  emailG = document.querySelectorAll('input[name="email"]');
//Geo input Flags
function itiFlagsAdd(element) {
  var iti = intlTelInput(element, {
    // allowDropdown: false,
    autoPlaceholder: false,
    autoHideDialCode: false,
    preferredCountries: ["us", "ca", "de",],
    separateDialCode: true,
    // autoHideDialCode: false,
    //  autoPlaceholder: false,
    // dropdownContainer: document.body,
    // excludeCountries: ["us"],
    formatOnDisplay: false,
    geoIpLookup: function (callback) {
      $.get(
        "https://get.geojs.io/v1/ip/country.json",
        function () { },

      ).always(function (resp) {
        const countryCode = resp && resp.country ? resp.country : "US";
        document
          .querySelectorAll('input[name="code"]')
          .forEach((item) => (item.value = countryCode));

        callback(countryCode);
      });
    },
    // initialCountry: "auto",
    hiddenInput: "full_number",
    // localizedCountries: { 'de': 'Deutschland' },
    nationalMode: false,
    onlyCountries: ["us"],
    placeholderNumberType: "MOBILE",
    // preferredCountries,
    // separateDialCode
  });

  element.addEventListener("countrychange", function () {
    // do something with iti.getSelectedCountryData()
    codeCountry.forEach((item) => {
      item.value = iti.getSelectedCountryData().iso2;
    });
  });

  const currentFormVal = element.closest("form");

  // Validation current form logic
  currentFormVal.addEventListener("submit", function (e) {
    e.preventDefault();
    const currentForm = e.target.closest("form");
    const full_number = currentForm.querySelector('input[name="full_number"]');
    const errorMsgTarget = currentForm.querySelector(".phone-eror-mess");
    const answerssValue = currentForm.querySelector('input[name="answer"]');
    if (element.value.trim()) {
      if (iti.isValidNumber()) {
        element.classList.add("valid");
        element.classList.remove("isValid");
        errorMsgTarget.innerHTML = "";
      } else {
        let errorCode =
          iti.getValidationError() < 0 ? 0 : iti.getValidationError();
        settingObjForm.postParams.phone = full_number.value;
        settingObjForm.postParams._setParams(answerssValue.value);

        settingObjForm.postParams.respons = errorItiMap[errorCode];

        element.classList.remove("valid");
        element.classList.add("isValid");

        errorMsgTarget.innerHTML = errorItiMap[errorCode];
      }
    } else {
      element.classList.add("isValid");
    }
  });
}

const inputsPhone = document.querySelectorAll("._phone");
inputsPhone.forEach((phone) => {
  itiFlagsAdd(phone);
});
//Geo input Flags

const modalError = document.querySelector(".modal-errors");

const formName = document.querySelectorAll('input[name="name"]');
const formLastName = document.querySelectorAll('input[name="last_name"]');
const formEmail = document.querySelectorAll('input[name="email"]');

//messageErrorsModal
const closeModal = document.querySelector(".modal-errors__close");
const modal_errors__content = document.querySelector(".modal-errors__content");
closeModal.addEventListener("click", () =>
  modalError.classList.remove("active")
);
//End messageErrorsModal

formName.forEach((input) => {
  input.addEventListener("input", function (e) {
    for (let i = 0; i < formName.length; i++) {
      formName[i].value = e.target.value;
    }
    formName.value = e.target.value;
  });
});

formLastName.forEach((input) => {
  input.addEventListener("input", function (e) {
    for (let i = 0; i < formLastName.length; i++) {
      formLastName[i].value = e.target.value;
    }
    formLastName.value = e.target.value;
  });
});

formEmail.forEach((input) => {
  input.addEventListener("input", function (e) {
    for (let i = 0; i < formEmail.length; i++) {
      formEmail[i].value = e.target.value;
    }
    formEmail.value = e.target.value;
  });
});

const allArraysInputs = [
  ...document.querySelectorAll('input[name="last_name"]'),
  ...document.querySelectorAll('input[name="name"]'),
  //   ...document.querySelectorAll('input[name="phone"]'),
  ...document.querySelectorAll('input[name="email"]'),
];
const allPhoneInput = document.querySelectorAll('input[name="phone"]');
let phonPlasholder = allPhoneInput.placeholder;
//Post data form

const allBtnSubmit = document.querySelectorAll(".buttonSend");
const btnFormText = document.querySelectorAll(".btnFormText");

const postData = async (data) => {
  addLoader(allBtnSubmit, btnFormText);
  // preloaderFormSend();


  const response = await fetch(`./order.php${window.location.search}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  const result = await response.json();
  settingObjForm.postParams.respons = result;
  if (result.status) {
    settingObjForm.postParams.respons = result;
    postToGoogle(settingObjForm, 'PlataProkl', settingObjForm.postParams.respons);
    allBtnSubmit.forEach((btn) => {
      btn.disabled = true;
    });
    preloaderFormSend();
    //Track Registration event for facebook
    function leadTrack() {
      fbq("track", "Lead");
    }
    leadTrack();
    // postToGoogle();
    setTimeout(() => {
      // thenkYouPage();
      if (result.link_auto_login) {
        window.location.href = result.link_auto_login;
      } else {
        // location.href = "/confirm.php";
        thenkYouPage();
      }
    }, 3000);
  } else {
    settingObjForm.postParams.respons = result;
    postToGoogle(settingObjForm, 'PlataProkl', settingObjForm.postParams.respons);
    allBtnSubmit.forEach((btn) => {
      btn.disabled = false;
    });
    //Выключаем loader
    removeLoader(allBtnSubmit, btnFormText);
  }

  // mainForm.reset();
};
const allForm = document.querySelectorAll("._main-form");
allForm.forEach((form) => {
  form.addEventListener("click", (e) => {
    const currentForm = e.target.closest("form");
    const lastName = currentForm.querySelector('input[name="last_name"]');
    const firstName = currentForm.querySelector('input[name="name"]');

    lastName.addEventListener("keyup", (e) => {
      regValidatorInputText(formLastName);
    });
    firstName.addEventListener("keyup", (e) => {
      regValidatorInputText(formName);
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const currentForm = e.target.closest("form");
    const phoneNumberCurrent = currentForm.querySelector('input[name="phone"]');
    const full_number = currentForm.querySelector('input[name="full_number"]');
    const answerssValue = currentForm.querySelector('input[name="answer"]');

    //PHONE VALIDATION
    regValidatorInputText([...lastNameG, ...firstNameG]);

    validEmail(emailG);
    const validForm = allArraysInputs.every((item) => {
      return item.classList.contains("valid");
    });

    validPhoneNumber(phoneNumberCurrent);

    const validFormPhone = phoneNumberCurrent.classList.contains("valid");

    if (validFormPhone && validForm) {
      addLoader(allBtnSubmit, btnFormText);
      allBtnSubmit.forEach((btn) => {
        btn.disabled = true;
      });
      settingObjForm.postParams.phone = full_number.value;
      settingObjForm.postParams._setParams(answerssValue.value);

      postData(settingObjForm.postParams);
    }
  });
});
