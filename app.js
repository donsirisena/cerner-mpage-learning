        const CCL_PROGRAM =
            "nygh_mpage_learning:group1";


        let data = {
            patients: []
        };


        let sortAscending = true;

        const nameSortIndicator =
            document.getElementById(
                "nameSortIndicator"
            );

        const diagnosisSortIndicator =
            document.getElementById(
                "diagnosisSortIndicator"
            );

        const tableBody =
            document.getElementById(
                "patientTableBody"
            );


        const searchBox =
            document.getElementById(
                "searchBox"
            );


        const diagnosisFilter =
            document.getElementById(
                "diagnosisFilter"
            );


        const nameHeader =
            document.getElementById(
                "nameHeader"
            );

        const diagnosisHeader =
            document.getElementById("diagnosisHeader");

        const refreshButton =
            document.getElementById(
                "refreshButton"
            );


        const statusMessage =
            document.getElementById(
                "statusMessage"
            );


        function renderPatients(patients) {

            tableBody.innerHTML = "";
            

            if (patients.length === 0) {

                const row =
                    document.createElement("tr");


                row.innerHTML = `
                    <td
                        colspan="4"
                        class="empty-message"
                    >
                        No patients found.
                    </td>
                `;


                tableBody.appendChild(row);

                return;
            }


            patients.forEach(
                function(patient) {

                    const row =
                        document.createElement("tr");


                    row.innerHTML = `
                        <td>
                            <a href="#" class="patient-link">
                            ${patient.name}
                            </a>
                        </td>
                        <td>${patient.mrn}</td>
                        <td>${patient.age}</td>
                        <td>${patient.diagnosis}</td>
                    `;

                    const patientLink =
                     row.querySelector(".patient-link");

                    patientLink.addEventListener(
                            "click",
                        function(event) {
                        event.preventDefault();
                        event.stopPropagation();

                        openPatientChart(patient);
                        }
                    );

                    row.addEventListener(
                        "click",
                        function() {

                            showPatientDetails(
                                patient
                            );

                        }
                    );


                    tableBody.appendChild(row);

                }
            );

        }


        function showPatientDetails(patient) {

            const details =
                document.getElementById(
                    "patientDetails"
                );


            details.innerHTML = `

                <h2>Patient Details</h2>

                <div class="details-grid">

                    <div class="details-label">
                        Name
                    </div>

                    <div>
                        ${patient.name}
                    </div>


                    <div class="details-label">
                        MRN
                    </div>

                    <div>
                        ${patient.mrn}
                    </div>


                    <div class="details-label">
                        Age
                    </div>

                    <div>
                        ${patient.age}
                    </div>


                    <div class="details-label">
                        Diagnosis
                    </div>

                    <div>
                        ${patient.diagnosis}
                    </div>

                </div>
            `;

        }


        function buildDiagnosisDropdown() {

            diagnosisFilter.innerHTML = `
                <option value="all">
                    All Diagnoses
                </option>
            `;


            const diagnoses = [];


            data.patients.forEach(
                function(patient) {

                    if (
                        !diagnoses.includes(
                            patient.diagnosis
                        )
                    ) {

                        diagnoses.push(
                            patient.diagnosis
                        );

                    }

                }
            );


            diagnoses.sort();


            diagnoses.forEach(
                function(diagnosis) {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        diagnosis;


                    option.textContent =
                        diagnosis;


                    diagnosisFilter.appendChild(
                        option
                    );

                }
            );

        }


        function filterPatients() {

            const searchText =
                searchBox.value
                    .toLowerCase();


            const selectedDiagnosis =
                diagnosisFilter.value;


            const filteredPatients =
                data.patients.filter(
                    function(patient) {

                        const matchesSearch =
                            patient.name
                                .toLowerCase()
                                .startsWith(
                                    searchText
                                );


                        const matchesDiagnosis =
                            selectedDiagnosis === "all"
                            ||
                            patient.diagnosis ===
                            selectedDiagnosis;


                        return (
                            matchesSearch &&
                            matchesDiagnosis
                        );

                    }
                );

              renderPatients(
                filteredPatients
            );

        }

                  function openPatientChart(patient) {
                openChart(
                    patient.personId,
                    patient.encntrId
                );
                }

            function openChart(personId, encntrId, tabName = "") {
                

                        
                APPLINK(
                    0,
                        "Powerchart.exe",
                        "/PERSONID=" + personId +
                        " /ENCNTRID=" + encntrId +
                    (
                        tabName.trim() !== ""
                            ? " /FIRSTTAB=^" + tabName + "^"
                            : ""
                    )
                );
        }                


        function setDefaultDates() {
            const today = new Date();
            const lastDayOfPreviousMonth = new Date(
                today.getFullYear(), today.getMonth(), 0
            );
            const fromDate = new Date(
                lastDayOfPreviousMonth.getFullYear(),
                lastDayOfPreviousMonth.getMonth(),
                Math.min(today.getDate(), lastDayOfPreviousMonth.getDate())
            );

            function formatInputDate(date) {
                return date.getFullYear() + "-" +
                    ("0" + (date.getMonth() + 1)).slice(-2) + "-" +
                    ("0" + date.getDate()).slice(-2);
            }

            document.getElementById("toDate").value = formatInputDate(today);
            document.getElementById("fromDate").value = formatInputDate(fromDate);
        }


        function formatDateForCCL(dateValue, timeValue) {
            const months = [
                "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
                "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
            ];
            const parts = dateValue.split("-");

            // Format the selected calendar date without timezone conversion.
            return parts[2] + "-" + months[Number(parts[1]) - 1] + "-" +
                parts[0] + " " + timeValue;
        }


        function loadPatients() {

            const fromDateInput = document.getElementById("fromDate");
            const toDateInput = document.getElementById("toDate");
            const fromDate = fromDateInput.value;
            const toDate = toDateInput.value;

            if (!fromDate || !toDate) {
                statusMessage.textContent =
                    "Please enter both From Date and To Date.";
                return;
            }

            if (!fromDateInput.checkValidity() || !toDateInput.checkValidity()) {
                statusMessage.textContent = "Please enter valid dates.";
                return;
            }

            // Date controls return YYYY-MM-DD, which sorts chronologically.
            if (fromDate > toDate) {
                statusMessage.textContent =
                    "From Date must not be after To Date.";
                return;
            }

            const formattedFromDate = formatDateForCCL(fromDate, "00:00:00");
            const formattedToDate = formatDateForCCL(toDate, "23:59:59");

            statusMessage.textContent =
                "Loading patients...";


            const request =
                new XMLCclRequest();


            request.onreadystatechange =
                function() {

                    if (
                        request.readyState === 4
                        &&
                        request.status === 200
                    ) {

                        try {

                            const response =
                                JSON.parse(
                                    request.responseText
                                );


                            data.patients =
                                response
                                    .reply
                                    .patients
                                || [];


                            buildDiagnosisDropdown();


                            filterPatients();


                            statusMessage.textContent =
                                "Loaded " +
                                data.patients.length +
                                " patients successfully.";

                        }

                        catch (error) {

                            statusMessage.textContent =
                                "Unable to process patient data.";

                            console.error(
                                error
                            );

                        }

                    }

                };


            request.open(
                "GET",
                CCL_PROGRAM,
                true
            );


            request.send(
             "^MINE^,^" +
                    formattedFromDate +
                        "^,^" +
                        formattedToDate +
                        "^"
            );

        }


        searchBox.addEventListener(
            "input",
            filterPatients
        );


        diagnosisFilter.addEventListener(
            "change",
            filterPatients
        );


        refreshButton.addEventListener(
            "click",
            loadPatients
        );


    nameHeader.addEventListener(
    "click",
    function() {

        data.patients.sort(
            function(a, b) {

                if (sortAscending) {

                    return a.name.localeCompare(
                        b.name
                    );

                }

                else {

                    return b.name.localeCompare(
                        a.name
                    );

                }

            }
        );


        if (sortAscending) {

            nameSortIndicator.textContent =
                "▲";

        }

        else {

            nameSortIndicator.textContent =
                "▼";

        }


        diagnosisSortIndicator.textContent =
            "↕";


        sortAscending =
            !sortAscending;


        filterPatients();

    }
    );
    diagnosisHeader.addEventListener(
    "click",
    function() {

        data.patients.sort(
            function(a, b) {

                if (sortAscending) {

                    return a.diagnosis.localeCompare(
                        b.diagnosis
                    );

                }

                else {

                    return b.diagnosis.localeCompare(
                        a.diagnosis
                    );

                }

            }
        );


        if (sortAscending) {

            diagnosisSortIndicator.textContent =
                "▲";

        }

        else {

            diagnosisSortIndicator.textContent =
                "▼";

        }


        nameSortIndicator.textContent =
            "↕";


        sortAscending =
            !sortAscending;


        filterPatients();

    }
    );

    const resizableHeaders =
    document.querySelectorAll(
        "th.resizable"
    );

resizableHeaders.forEach(
    function(header, columnIndex) {

        const handle =
            header.querySelector(
                ".resize-handle"
            );

        handle.addEventListener(
            "mousedown",
            function(event) {

                event.preventDefault();
                event.stopPropagation();

                const startX =
                    event.pageX;

                const startWidth =
                    header.offsetWidth;


                function resizeColumn(event) {

                    const newWidth =
                        startWidth +
                        (
                            event.pageX -
                            startX
                        );

                    if (newWidth < 70) {
                        return;
                    }

                    header.style.width =
                        newWidth + "px";

                    header.style.minWidth =
                        newWidth + "px";

                    header.style.maxWidth =
                        newWidth + "px";


                    const rows =
                        document.querySelectorAll(
                            "#patientTableBody tr"
                        );

                    rows.forEach(
                        function(row) {

                            const cell =
                                row.children[
                                    columnIndex
                                ];

                            if (cell) {

                                cell.style.width =
                                    newWidth + "px";

                                cell.style.minWidth =
                                    newWidth + "px";

                                cell.style.maxWidth =
                                    newWidth + "px";

                            }

                        }
                    );

                }


                function stopResize() {

                    document.removeEventListener(
                        "mousemove",
                        resizeColumn
                    );

                    document.removeEventListener(
                        "mouseup",
                        stopResize
                    );

                }


                document.addEventListener(
                    "mousemove",
                    resizeColumn
                );

                document.addEventListener(
                    "mouseup",
                    stopResize
                );

            }
        );

    }
);


        setDefaultDates();
        loadPatients();