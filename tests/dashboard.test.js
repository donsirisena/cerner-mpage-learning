const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, ResourceLoader, VirtualConsole } = require("jsdom");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

async function dashboard(
  t,
  {
    local = true,
    cernerUnavailable = false,
    patients,
    response,
    status = 200,
    html = read("index.html")
  } = {}
) {
  const requests = [],
    charts = [],
    assets = [],
    errors = [];
  class Assets extends ResourceLoader {
    fetch(url) {
      const name = new URL(url).pathname.slice(1);
      assets.push(name);
      if (name === "local-data.js" && patients) {
        return Promise.resolve(
          Buffer.from(
            "window.loadSyntheticPatients = function(a,b,done) { done(null," +
              JSON.stringify(patients) +
              "); };"
          )
        );
      }
      if (["app.js", "styles.css", "local-data.js"].includes(name)) {
        return Promise.resolve(Buffer.from(read(name)));
      }
      throw new Error("Unexpected external request: " + url);
    }
  }
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error));
  const dom = new JSDOM(html, {
    url: "http://dashboard.test/index.html" + (local ? "?mode=local" : ""),
    runScripts: "dangerously",
    resources: new Assets(),
    virtualConsole,
    beforeParse(window) {
      if (local) {
        // Fail even if local mode merely attempts to read a Cerner global.
        for (const name of ["XMLCclRequest", "APPLINK"]) {
          Object.defineProperty(window, name, {
            get() {
              throw new Error("Local mode accessed " + name);
            }
          });
        }
      } else if (!cernerUnavailable) {
        window.APPLINK = (...args) => charts.push(args);
        window.XMLCclRequest = function () {
          this.open = (...args) => {
            this.openArgs = args;
          };
          this.send = (args) => {
            requests.push({ open: this.openArgs, send: args });
            window.setTimeout(() => {
              this.readyState = 4;
              this.status = status;
              this.responseText =
                response === undefined
                  ? JSON.stringify({ reply: { patients: patients || [] } })
                  : response;
              this.onreadystatechange();
            }, 0);
          };
        };
      }
    }
  });
  t.after(() => dom.window.close());
  const document = dom.window.document;
  const wait = async (predicate) => {
    for (let i = 0; i < 200; i++) {
      if (predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error(
      "Timed out: " +
        document.getElementById("statusMessage").textContent +
        "; " +
        errors
    );
  };
  await wait(() =>
    /Loaded|Unable|unavailable/.test(
      document.getElementById("statusMessage").textContent
    )
  );
  assert.deepEqual(errors, []);
  const event = (id, type, value) => {
    const node = document.getElementById(id);
    if (value !== undefined) node.value = value;
    node.dispatchEvent(new dom.window.Event(type, { bubbles: true }));
  };
  return {
    dom,
    document,
    event,
    wait,
    requests,
    charts,
    assets,
    names: () =>
      [...document.querySelectorAll(".patient-link")].map(
        (node) => node.textContent
      ),
    message: () => document.getElementById("statusMessage").textContent
  };
}
const fabricated = [
  {
    name: "Zed Example",
    mrn: "SYN-01",
    age: 40,
    diagnosis: "Asthma",
    personId: 101,
    encntrId: 201
  },
  {
    name: "Alex Sample",
    mrn: "SYN-02",
    age: 50,
    diagnosis: "Diabetes",
    personId: 102,
    encntrId: 202
  },
  {
    name: "Alexis Fiction",
    mrn: "SYN-03",
    age: 30,
    diagnosis: "Asthma",
    personId: 103,
    encntrId: 203
  }
];

test("local mode loads real synthetic adapter without Cerner APIs and does not launch charts", async (t) => {
  const app = await dashboard(t);
  assert.equal(app.names().length, 4);
  assert.match(app.message(), /LOCAL SYNTHETIC DATA/);
  assert.match(
    app.document.querySelector(".page-header p").textContent,
    /FABRICATED/
  );
  app.document.querySelector(".patient-link").click();
  assert.match(app.message(), /chart opening is disabled/);
  assert.match(
    app.document.getElementById("patientDetails").textContent,
    /Alex Example/
  );
  app.event("fromDate", "change", "2000-01-01");
  app.event("toDate", "change", "2000-01-02");
  app.event("refreshButton", "click");
  await app.wait(() => /Loaded 0/.test(app.message()));
  assert.deepEqual(app.names(), []);
  assert.match(
    app.document.querySelector(".empty-message").textContent,
    /No patients/
  );
});

test("name search is case-insensitive includes matching; diagnosis combines with search", async (t) => {
  const app = await dashboard(t, { patients: fabricated });
  app.event("searchBox", "input", " ALex ");
  assert.deepEqual(app.names(), ["Alex Sample", "Alexis Fiction"]);
  app.event("searchBox", "input", " fICtion ");
  assert.deepEqual(app.names(), ["Alexis Fiction"]);
  app.event("searchBox", "input", "AMP");
  assert.deepEqual(app.names(), ["Zed Example", "Alex Sample"]);
  app.event("searchBox", "input", "Alex");
  app.event("diagnosisFilter", "change", "Asthma");
  assert.deepEqual(app.names(), ["Alexis Fiction"]);
  app.event("searchBox", "input", "missing");
  assert.deepEqual(app.names(), []);
  assert.deepEqual(
    [...app.document.getElementById("diagnosisFilter").options].map((o) =>
      o.textContent.trim()
    ),
    ["All Diagnoses", "Asthma", "Diabetes"]
  );
});

test("sort toggles each active column and preserves filtering and order after refresh", async (t) => {
  const app = await dashboard(t, { patients: fabricated });
  app.event("nameHeader", "click");
  assert.deepEqual(app.names(), [
    "Alex Sample",
    "Alexis Fiction",
    "Zed Example"
  ]);
  app.event("nameHeader", "click");
  assert.deepEqual(app.names(), [
    "Zed Example",
    "Alexis Fiction",
    "Alex Sample"
  ]);
  app.event("diagnosisHeader", "click");
  assert.deepEqual(app.names(), [
    "Zed Example",
    "Alexis Fiction",
    "Alex Sample"
  ]);
  app.event("diagnosisHeader", "click");
  assert.equal(app.names()[0], "Alex Sample");
  app.event("diagnosisFilter", "change", "Asthma");
  app.event("nameHeader", "click");
  app.event("refreshButton", "click");
  assert.equal(app.document.getElementById("diagnosisFilter").value, "Asthma");
  assert.deepEqual(app.names(), ["Alexis Fiction", "Zed Example"]);
});

test("patient text is literal in table, diagnosis options, and details", async (t) => {
  const attack = '<img src=x onerror="window.injected=true">';
  const app = await dashboard(t, {
    patients: [{ name: attack, mrn: attack, age: attack, diagnosis: attack }]
  });
  assert.equal(app.names()[0], attack);
  app.document.querySelector("#patientTableBody tr").click();
  for (const selector of [
    "#patientTableBody",
    "#patientDetails",
    "#diagnosisFilter"
  ]) {
    assert.equal(
      app.document.querySelector(selector).querySelector("img"),
      null
    );
    assert.ok(
      app.document.querySelector(selector).textContent.includes(attack)
    );
  }
  assert.equal(app.dom.window.injected, undefined);
});

test("Cerner default keeps CCL program, parameters and APPLINK chart arguments", async (t) => {
  const app = await dashboard(t, { local: false, patients: fabricated });
  assert.deepEqual(app.requests[0].open, [
    "GET",
    "nygh_mpage_learning:group1",
    true
  ]);
  assert.ok(!app.assets.includes("local-data.js"));
  app.event("fromDate", "change", "2024-02-29");
  app.event("toDate", "change", "2024-03-01");
  app.event("refreshButton", "click");
  assert.equal(
    app.requests[1].send,
    "^MINE^,^29-FEB-2024 00:00:00^,^01-MAR-2024 23:59:59^"
  );
  await app.wait(() => !app.document.getElementById("refreshButton").disabled);
  app.document.querySelector(".patient-link").click();
  assert.deepEqual(app.charts, [
    [0, "Powerchart.exe", "/PERSONID=101 /ENCNTRID=201"]
  ]);
});

test("invalid or reversed dates prevent a new request", async (t) => {
  const app = await dashboard(t, { local: false });
  app.event("fromDate", "change", "");
  app.event("refreshButton", "click");
  assert.match(app.message(), /enter both/);
  app.event("fromDate", "change", "2025-03-01");
  app.event("toDate", "change", "2025-02-01");
  app.event("refreshButton", "click");
  assert.match(app.message(), /must not be after/);
  assert.equal(app.requests.length, 1);
});

for (const [label, options, expected] of [
  ["HTTP failure", { status: 500 }, /status 500/],
  ["bad JSON", { response: "{broken" }, /Unable to process/],
  ["bad schema", { response: '{"reply":{"patients":{}}}' }, /Unable to process/]
]) {
  test(
    "Cerner " + label + " produces an error and re-enables refresh",
    async (t) => {
      const app = await dashboard(t, { local: false, ...options });
      assert.match(app.message(), expected);
      assert.equal(
        app.document.getElementById("refreshButton").disabled,
        false
      );
    }
  );
}

test("single-file MPage build preserves Cerner metadata and runs the same integration", async (t) => {
  require("node:child_process").execFileSync(
    process.execPath,
    ["scripts/build-mpage.js"],
    { cwd: root }
  );
  const html = read("dist/index.html");
  assert.match(html, /XMLCCLREQUEST,APPLINK,MPAGES_EVENT/);
  assert.doesNotMatch(html, /src="app.js"|href="styles.css"/);
  const app = await dashboard(t, { html, local: false, patients: fabricated });
  assert.equal(app.names().length, 3);
  assert.equal(app.requests.length, 1);
});

test("default mode never falls back to synthetic data when Cerner is absent", async (t) => {
  const app = await dashboard(t, { local: false, cernerUnavailable: true });
  assert.match(app.message(), /Cerner patient loading is unavailable/);
  assert.equal(app.assets.includes("local-data.js"), false);
  assert.deepEqual(app.names(), []);
});

test("local mode also loads its relative assets directly from file URLs", async (t) => {
  const dom = await JSDOM.fromFile(path.join(root, "index.html"), {
    url:
      require("node:url").pathToFileURL(path.join(root, "index.html")).href +
      "?mode=local",
    resources: "usable",
    runScripts: "dangerously"
  });
  t.after(() => dom.window.close());
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      clearInterval(poll);
      reject(new Error("file URL loading timed out"));
    }, 2000);
    const poll = setInterval(() => {
      if (
        /Loaded 4/.test(
          dom.window.document.getElementById("statusMessage").textContent
        )
      ) {
        clearTimeout(timer);
        clearInterval(poll);
        resolve();
      }
    }, 10);
  });
  assert.equal(dom.window.document.querySelectorAll(".patient-link").length, 4);
  assert.match(read("local.html"), /url=index.html\?mode=local/);
});


test("MRN search requires normalized exact equality and combines with diagnosis", async (t) => {
  const app = await dashboard(t, { patients: fabricated });
  app.event("searchBox", "input", " syn-02 ");
  assert.deepEqual(app.names(), ["Alex Sample"]);
  for (const query of ["SYN", "SYN-0", "02", "SYN-020"]) {
    app.event("searchBox", "input", query);
    assert.deepEqual(app.names(), [], query + " must not partially match MRNs");
  }
  app.event("searchBox", "input", "SYN-02");
  app.event("diagnosisFilter", "change", "Asthma");
  assert.deepEqual(app.names(), []);
  app.event("diagnosisFilter", "change", "Diabetes");
  assert.deepEqual(app.names(), ["Alex Sample"]);
  app.event("diagnosisFilter", "change", "all");
  app.event("searchBox", "input", "   ");
  assert.deepEqual(app.names(), fabricated.map(patient => patient.name));
});

test("MRNs normalize stored spaces and case without losing leading zeroes", async (t) => {
  const app = await dashboard(t, { patients: [
    {...fabricated[0], mrn: "  sYn-01  "},
    {...fabricated[1], mrn: "000123"},
    {...fabricated[2], mrn: null}
  ] });
  app.event("searchBox", "input", " SYN-01 ");
  assert.deepEqual(app.names(), ["Zed Example"]);
  app.event("searchBox", "input", "123");
  assert.deepEqual(app.names(), []);
  app.event("searchBox", "input", "000123");
  assert.deepEqual(app.names(), ["Alex Sample"]);
});
