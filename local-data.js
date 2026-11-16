/* Fabricated examples only. Loaded exclusively by explicit local mode. */
(function () {
  "use strict";
  window.loadSyntheticPatients = function (fromDate, toDate, callback) {
    // Anchor records to today so the default date range always has results.
    const today = new Date();
    function dateAtOffset(offset) {
      const date = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + offset
      );
      return (
        date.getFullYear() +
        "-" +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + date.getDate()).slice(-2)
      );
    }
    const patients = [
      {
        name: "Alex Example",
        mrn: "SYN-001",
        age: 45,
        diagnosis: "Asthma",
        personId: 900001,
        encntrId: 800001,
        encounterDate: dateAtOffset(0)
      },
      {
        name: "Jamie Sample",
        mrn: "SYN-002",
        age: 62,
        diagnosis: "Diabetes",
        personId: 900002,
        encntrId: 800002,
        encounterDate: dateAtOffset(-2)
      },
      {
        name: "Alexis Fiction",
        mrn: "SYN-003",
        age: 29,
        diagnosis: "Asthma",
        personId: 900003,
        encntrId: 800003,
        encounterDate: dateAtOffset(-7)
      },
      {
        name: "Morgan Demo",
        mrn: "SYN-004",
        age: 51,
        diagnosis: "Hypertension",
        personId: 900004,
        encntrId: 800004,
        encounterDate: dateAtOffset(-14)
      },
      {
        name: "Taylor Test",
        mrn: "SYN-005",
        age: 37,
        diagnosis: "Diabetes",
        personId: 900005,
        encntrId: 800005,
        encounterDate: dateAtOffset(-60)
      }
    ];
    window.setTimeout(function () {
      callback(
        null,
        patients.filter(function (patient) {
          return (
            patient.encounterDate >= fromDate && patient.encounterDate <= toDate
          );
        })
      );
    }, 50);
  };
})();
