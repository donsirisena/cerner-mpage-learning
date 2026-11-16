(function () {
  "use strict";
  const CCL_PROGRAM = "nygh_mpage_learning:group1";

  let data = {
    patients: []
  };

  // Cerner remains the default. Synthetic mode must be explicitly selected.
  const localMode = /(?:^|[?&])mode=local(?:&|$)/.test(window.location.search);
  let sortColumn = null;
  let sortAscending = true;
  let loadVersion = 0;

  const nameSortIndicator = document.getElementById("nameSortIndicator");

  const diagnosisSortIndicator = document.getElementById(
    "diagnosisSortIndicator"
  );

  const tableBody = document.getElementById("patientTableBody");

  const searchBox = document.getElementById("searchBox");

  const diagnosisFilter = document.getElementById("diagnosisFilter");

  const nameHeader = document.getElementById("nameHeader");

  const diagnosisHeader = document.getElementById("diagnosisHeader");

  const refreshButton = document.getElementById("refreshButton");

  const statusMessage = document.getElementById("statusMessage");

  function textElement(tag, value, className) {
    const element = document.createElement(tag);
    element.textContent = value == null ? "" : String(value);
    if (className) element.className = className;
    return element;
  }

  function resetDetails() {
    const details = document.getElementById("patientDetails");
    details.textContent = "";
    details.appendChild(textElement("h2", "Patient Details"));
    details.appendChild(textElement("p", "Select a patient from the table."));
  }

  function renderPatients(patients) {
    tableBody.textContent = "";
    if (!patients.length) {
      const row = document.createElement("tr");
      const cell = textElement("td", "No patients found.", "empty-message");
      cell.colSpan = 4;
      row.appendChild(cell);
      tableBody.appendChild(row);
    }
    patients.forEach(function (patient) {
      const row = document.createElement("tr");
      const nameCell = document.createElement("td");
      const link = textElement("a", patient.name, "patient-link");
      link.href = "#";
      link.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        openPatientChart(patient);
      });
      nameCell.appendChild(link);
      row.appendChild(nameCell);
      [patient.mrn, patient.age, patient.diagnosis].forEach(function (value) {
        row.appendChild(textElement("td", value));
      });
      row.addEventListener("click", function () {
        showPatientDetails(patient);
      });
      tableBody.appendChild(row);
    });
  }

  function showPatientDetails(patient) {
    const details = document.getElementById("patientDetails");
    details.textContent = "";
    details.appendChild(textElement("h2", "Patient Details"));
    const grid = textElement("div", "", "details-grid");
    [
      ["Name", patient.name],
      ["MRN", patient.mrn],
      ["Age", patient.age],
      ["Diagnosis", patient.diagnosis]
    ].forEach(function (pair) {
      grid.appendChild(textElement("div", pair[0], "details-label"));
      grid.appendChild(textElement("div", pair[1]));
    });
    details.appendChild(grid);
  }

  function buildDiagnosisDropdown() {
    const previousDiagnosis = diagnosisFilter.value;
    diagnosisFilter.textContent = "";
    const allOption = textElement("option", "All Diagnoses");
    allOption.value = "all";
    diagnosisFilter.appendChild(allOption);

    const diagnoses = [];

    data.patients.forEach(function (patient) {
      if (!diagnoses.includes(patient.diagnosis)) {
        diagnoses.push(patient.diagnosis);
      }
    });

    diagnoses.sort();

    diagnoses.forEach(function (diagnosis) {
      const option = document.createElement("option");

      option.value = diagnosis;

      option.textContent = diagnosis;

      diagnosisFilter.appendChild(option);
    });

    if (diagnoses.includes(previousDiagnosis))
      diagnosisFilter.value = previousDiagnosis;
  }

  function filterPatients() {
    const searchText = searchBox.value.trim().toLowerCase();

    const selectedDiagnosis = diagnosisFilter.value;

    const filteredPatients = data.patients.filter(function (patient) {
      const normalizedMrn = patient.mrn == null ? "" : String(patient.mrn).trim().toLowerCase();
      const matchesSearch =
        patient.name.toLowerCase().includes(searchText) ||
        normalizedMrn === searchText;

      const matchesDiagnosis =
        selectedDiagnosis === "all" || patient.diagnosis === selectedDiagnosis;

      return matchesSearch && matchesDiagnosis;
    });

    if (sortColumn) {
      filteredPatients.sort(function (a, b) {
        return (
          a[sortColumn].localeCompare(b[sortColumn]) * (sortAscending ? 1 : -1)
        );
      });
    }
    renderPatients(filteredPatients);
  }

  function openPatientChart(patient) {
    if (localMode) {
      showPatientDetails(patient);
      statusMessage.textContent =
        "Local synthetic mode: chart opening is disabled.";
      return;
    }
    openChart(patient.personId, patient.encntrId);
  }

  function openChart(personId, encntrId, tabName = "") {
    APPLINK(
      0,
      "Powerchart.exe",
      "/PERSONID=" +
        personId +
        " /ENCNTRID=" +
        encntrId +
        (tabName.trim() !== "" ? " /FIRSTTAB=^" + tabName + "^" : "")
    );
  }

  function setDefaultDates() {
    const today = new Date();
    const lastDayOfPreviousMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      0
    );
    const fromDate = new Date(
      lastDayOfPreviousMonth.getFullYear(),
      lastDayOfPreviousMonth.getMonth(),
      Math.min(today.getDate(), lastDayOfPreviousMonth.getDate())
    );

    function formatInputDate(date) {
      return (
        date.getFullYear() +
        "-" +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + date.getDate()).slice(-2)
      );
    }

    document.getElementById("toDate").value = formatInputDate(today);
    document.getElementById("fromDate").value = formatInputDate(fromDate);
  }

  function formatDateForCCL(dateValue, timeValue) {
    const months = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC"
    ];
    const parts = dateValue.split("-");

    // Format the selected calendar date without timezone conversion.
    return (
      parts[2] +
      "-" +
      months[Number(parts[1]) - 1] +
      "-" +
      parts[0] +
      " " +
      timeValue
    );
  }

  function loadPatients() {
    const fromDateInput = document.getElementById("fromDate");
    const toDateInput = document.getElementById("toDate");
    const fromDate = fromDateInput.value;
    const toDate = toDateInput.value;

    if (!fromDate || !toDate) {
      statusMessage.textContent = "Please enter both From Date and To Date.";
      return;
    }

    if (!fromDateInput.checkValidity() || !toDateInput.checkValidity()) {
      statusMessage.textContent = "Please enter valid dates.";
      return;
    }

    // Date controls return YYYY-MM-DD, which sorts chronologically.
    if (fromDate > toDate) {
      statusMessage.textContent = "From Date must not be after To Date.";
      return;
    }

    const formattedFromDate = formatDateForCCL(fromDate, "00:00:00");
    const formattedToDate = formatDateForCCL(toDate, "23:59:59");

    statusMessage.textContent = "Loading patients...";

    const version = ++loadVersion;
    function finish(error, patients) {
      if (version !== loadVersion) return;
      refreshButton.disabled = false;
      if (error) {
        statusMessage.textContent = error;
        return;
      }
      try {
        if (!Array.isArray(patients)) throw new Error("Invalid patients");
        data.patients = patients.map(function (patient) {
          if (!patient || typeof patient !== "object")
            throw new Error("Invalid patient");
          return Object.assign({}, patient, {
            name: patient.name == null ? "" : String(patient.name),
            diagnosis:
              patient.diagnosis == null ? "" : String(patient.diagnosis)
          });
        });
        buildDiagnosisDropdown();
        resetDetails();
        filterPatients();
        statusMessage.textContent =
          (localMode ? "LOCAL SYNTHETIC DATA — " : "") +
          "Loaded " +
          data.patients.length +
          " patients successfully.";
      } catch (error) {
        statusMessage.textContent = "Unable to process patient data.";
      }
    }
    refreshButton.disabled = true;
    if (localMode) {
      // No Cerner globals are read or called on this path.
      window.loadSyntheticPatients(fromDate, toDate, finish);
      return;
    }
    try {
      const request = new XMLCclRequest();
      request.onreadystatechange = function () {
        if (request.readyState !== 4) return;
        if (request.status !== 200) {
          finish("Unable to load patients (status " + request.status + ").");
          return;
        }
        try {
          const response = JSON.parse(request.responseText);
          finish(null, response.reply.patients || []);
        } catch (error) {
          finish("Unable to process patient data.");
        }
      };
      request.open("GET", CCL_PROGRAM, true);
      request.send(
        "^MINE^,^" + formattedFromDate + "^,^" + formattedToDate + "^"
      );
    } catch (error) {
      finish(
        "Cerner patient loading is unavailable. For fabricated data, open local.html."
      );
    }
  }

  searchBox.addEventListener("input", filterPatients);

  diagnosisFilter.addEventListener("change", filterPatients);

  refreshButton.addEventListener("click", loadPatients);

  function sortBy(column) {
    sortAscending = sortColumn === column ? !sortAscending : true;
    sortColumn = column;
    nameSortIndicator.textContent =
      column === "name" ? (sortAscending ? "▲" : "▼") : "↕";
    diagnosisSortIndicator.textContent =
      column === "diagnosis" ? (sortAscending ? "▲" : "▼") : "↕";
    filterPatients();
  }
  nameHeader.addEventListener("click", function () {
    sortBy("name");
  });
  diagnosisHeader.addEventListener("click", function () {
    sortBy("diagnosis");
  });

  const resizableHeaders = document.querySelectorAll("th.resizable");

  resizableHeaders.forEach(function (header, columnIndex) {
    const handle = header.querySelector(".resize-handle");

    handle.addEventListener("mousedown", function (event) {
      event.preventDefault();
      event.stopPropagation();

      const startX = event.pageX;

      const startWidth = header.offsetWidth;

      function resizeColumn(event) {
        const newWidth = startWidth + (event.pageX - startX);

        if (newWidth < 70) {
          return;
        }

        header.style.width = newWidth + "px";

        header.style.minWidth = newWidth + "px";

        header.style.maxWidth = newWidth + "px";

        const rows = document.querySelectorAll("#patientTableBody tr");

        rows.forEach(function (row) {
          const cell = row.children[columnIndex];

          if (cell) {
            cell.style.width = newWidth + "px";

            cell.style.minWidth = newWidth + "px";

            cell.style.maxWidth = newWidth + "px";
          }
        });
      }

      function stopResize() {
        document.removeEventListener("mousemove", resizeColumn);

        document.removeEventListener("mouseup", stopResize);
      }

      document.addEventListener("mousemove", resizeColumn);

      document.addEventListener("mouseup", stopResize);
    });
  });

  setDefaultDates();
  if (localMode) {
    document.querySelector(".page-header p").textContent =
      "LOCAL DEVELOPMENT — FABRICATED PATIENTS ONLY";
    const script = document.createElement("script");
    script.src = "local-data.js";
    script.onload = loadPatients;
    script.onerror = function () {
      statusMessage.textContent = "Unable to load synthetic fixtures.";
    };
    document.head.appendChild(script);
  } else {
    loadPatients();
  }
})();
