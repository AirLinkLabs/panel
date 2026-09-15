/**
 * user/server/files.js — File browser interactions
 *
 * Vanilla JS, no framework. Reads window.__serverUUID and window.__currentPath
 * set by the EJS template.
 */
(function () {
  const serverId = window.__serverUUID;
  const currentPath = window.__currentPath || "";

  function getCsrfToken() {
    return (
      document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute("content") || ""
    );
  }

  function notify(type, message) {
    if (typeof window.showToast === "function") window.showToast(message, type);
  }

  // ── Modal helpers ──────────────────────────────────────────────────────
  function openModal(overlayId, panelId) {
    const overlay = document.getElementById(overlayId);
    const panel = document.getElementById(panelId);
    if (!overlay || !panel) return;
    overlay.classList.remove("opacity-0", "pointer-events-none");
    overlay.classList.add("open");
    panel.classList.add("open");
  }

  function closeModal(overlayId, panelId) {
    const overlay = document.getElementById(overlayId);
    const panel = document.getElementById(panelId);
    if (!overlay || !panel) return;
    overlay.classList.remove("open");
    panel.classList.remove("open");
    overlay.classList.add("opacity-0", "pointer-events-none");
  }

  // ── Refresh file list ──────────────────────────────────────────────────
  async function refreshFileList() {
    const tbody = document.getElementById("fileTableBody");
    if (!tbody) {
      window.location.reload();
      return;
    }
    tbody.innerHTML =
      '<tr><td colspan="4" class="px-4 py-8 text-center text-sm" style="color:var(--theme-text-muted)">Loading files…</td></tr>';
    try {
      const res = await fetch(
        "/api/v2/servers/" +
          encodeURIComponent(serverId) +
          "/files?path=" +
          encodeURIComponent(currentPath || "/"),
      );
      const data = await res.json();
      if (!data.success || typeof data.html !== "string") {
        throw new Error("Bad response");
      }
      tbody.innerHTML = data.html;
      bindRowEvents(tbody);
      selectedFiles = [];
      updateSelectedFiles();
    } catch {
      window.location.reload();
    }
  }

  // ── File row events ────────────────────────────────────────────────────
  function bindRowEvents(root) {
    root = root || document;
    root
      .querySelectorAll(".file-checkbox:not(#selectAll)")
      .forEach(function (checkbox) {
        checkbox.addEventListener("change", function (event) {
          var fileName = event.target.dataset.filename;
          if (event.target.checked) {
            if (!selectedFiles.includes(fileName)) selectedFiles.push(fileName);
          } else {
            selectedFiles = selectedFiles.filter(function (n) {
              return n !== fileName;
            });
          }
          var allBoxes = document.querySelectorAll(
            ".file-checkbox:not(#selectAll)",
          );
          var checkedCount = document.querySelectorAll(
            ".file-checkbox:not(#selectAll):checked",
          ).length;
          selectAllCheckbox.checked = checkedCount === allBoxes.length;
          selectAllCheckbox.indeterminate =
            checkedCount > 0 && checkedCount < allBoxes.length;
          updateSelectedFiles();
        });
      });
  }

  // ── Delete file ────────────────────────────────────────────────────────
  function deleteFile(fileName, filePath) {
    window.modal.confirm({
      title: "Delete File",
      body:
        'Are you sure you want to delete "' +
        fileName +
        '"? This cannot be undone.',
      danger: true,
      confirmLabel: "Delete",
      onConfirm: function () {
        fetch(
          "/api/v2/servers/" +
            encodeURIComponent(serverId) +
            "/files?path=" +
            encodeURIComponent(filePath),
          {
            method: "DELETE",
            headers: { "x-csrf-token": getCsrfToken() },
          },
        )
          .then(function (response) {
            if (response.ok) {
              notify("success", fileName + " deleted.");
              refreshFileList();
            } else {
              notify("error", "Failed to delete file");
            }
          })
          .catch(function () {
            notify("error", "Something went wrong.");
          });
      },
    });
  }

  // ── Download file ──────────────────────────────────────────────────────
  function downloadFile(fileName, filePath) {
    var url =
      "/server/" + serverId + "/files/download/" + encodeURIComponent(filePath);
    var a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ── File selection ─────────────────────────────────────────────────────
  var selectAllCheckbox = document.getElementById("selectAll");
  var floatingActionBar = document.getElementById("floatingActionBar");
  var selectedFiles = [];

  function updateSelectedFiles() {
    var count = selectedFiles.length;
    if (count > 0) {
      floatingActionBar.classList.remove("translate-y-full");
    } else {
      floatingActionBar.classList.add("translate-y-full");
    }
    document
      .querySelectorAll(".file-checkbox[data-filename]")
      .forEach(function (checkbox) {
        var row = checkbox.closest("tr");
        if (row) row.classList.toggle("is-selected", checkbox.checked);
      });
    document.getElementById("selectedFilesCount").textContent =
      count + " file(s) selected";
    document.getElementById("massDeleteBtn").disabled = count === 0;
    document.getElementById("massArchiveBtn").disabled = count === 0;
  }

  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", function (event) {
      var isChecked = event.target.checked;
      document
        .querySelectorAll(".file-checkbox:not(#selectAll)")
        .forEach(function (checkbox) {
          checkbox.checked = isChecked;
          var fileName = checkbox.dataset.filename;
          if (isChecked) {
            if (!selectedFiles.includes(fileName)) selectedFiles.push(fileName);
          } else {
            selectedFiles = selectedFiles.filter(function (n) {
              return n !== fileName;
            });
          }
        });
      updateSelectedFiles();
    });
  }

  // ── Create file/folder ─────────────────────────────────────────────────
  function openCreateFileModal() {
    document.getElementById("FileName").value = "";
    document.getElementById("fileNamePreview").textContent = "";
    document.getElementById("fileNamePreview").classList.add("hidden");
    document.getElementById("createModalTitle").textContent =
      window.__i18n.newFile || "New File";
    document.getElementById("createModalHint").textContent =
      window.__i18n.newFileDesc ||
      "File name. Use / to create in subdirectories.";
    document.getElementById("FileName").setAttribute("data-mode", "file");
    openModal("createFileModal", "createFileModalPanel");
    document.getElementById("FileName").focus();
  }

  function openCreateFolderModal() {
    document.getElementById("FileName").value = "";
    document.getElementById("fileNamePreview").textContent = "";
    document.getElementById("fileNamePreview").classList.add("hidden");
    document.getElementById("createModalTitle").textContent =
      window.__i18n.newFolder || "New Folder";
    document.getElementById("createModalHint").textContent =
      window.__i18n.folderNameHint ||
      "Folder name. Use / to create nested folders.";
    document.getElementById("FileName").setAttribute("data-mode", "folder");
    openModal("createFileModal", "createFileModalPanel");
    document.getElementById("FileName").focus();
  }

  function closeCreateFileModal() {
    closeModal("createFileModal", "createFileModalPanel");
  }

  async function confirmCreateFile() {
    var raw = document.getElementById("FileName").value.trim();
    var mode = document.getElementById("FileName").getAttribute("data-mode");
    if (!raw) {
      closeCreateFileModal();
      return;
    }

    var base = currentPath.replace(new RegExp("^/+", "g"), "");
    var finalPath;
    if (raw.startsWith("/")) {
      finalPath = raw.replace(/^\/+/, "");
    } else {
      finalPath = base ? base + "/" + raw : raw;
    }

    if (mode === "folder") {
      closeCreateFileModal();
      try {
        var parts = finalPath.split("/");
        var name = parts.pop();
        var parent = parts.join("/");
        var res = await fetch(
          "/api/v2/servers/" + encodeURIComponent(serverId) + "/files/mkdir",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-csrf-token": getCsrfToken(),
            },
            body: JSON.stringify({ path: parent || "/", name: name }),
          },
        );
        if (res.ok) {
          notify("success", raw + " created");
          refreshFileList();
        } else {
          notify("error", "Failed to create folder");
        }
      } catch {
        notify("error", "Error creating folder");
      }
      return;
    }

    // File: create empty via content endpoint
    try {
      var encoded = encodeURIComponent(finalPath);
      var res2 = await fetch(
        "/api/v2/servers/" +
          encodeURIComponent(serverId) +
          "/files/content?path=" +
          encoded,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": getCsrfToken(),
          },
          body: JSON.stringify({ content: "" }),
        },
      );
      if (res2.ok) {
        notify("success", raw + " created");
        refreshFileList();
      } else {
        notify("error", "Failed to create file");
      }
    } catch {
      notify("error", "Error creating file");
    }
  }

  // ── Rename ─────────────────────────────────────────────────────────────
  function openRenameModal(fileName, filePath) {
    document.getElementById("currentFileName").value = fileName;
    document.getElementById("currentFilePath").value = filePath;
    document.getElementById("newFileName").value = filePath;
    openModal("renameModal", "renameModalPanel");
    var input = document.getElementById("newFileName");
    var slashIndex = filePath.lastIndexOf("/");
    var nameStart = slashIndex + 1;
    var lastDotIndex = filePath.lastIndexOf(".");
    var nameEnd = lastDotIndex > nameStart ? lastDotIndex : filePath.length;
    input.setSelectionRange(nameStart, nameEnd);
    input.focus();
  }

  function closeRenameModal() {
    closeModal("renameModal", "renameModalPanel");
  }

  async function confirmRename() {
    var newPath = document.getElementById("newFileName").value.trim();
    var filePath = document.getElementById("currentFilePath").value;
    if (!newPath || newPath === filePath) {
      closeRenameModal();
      return;
    }
    closeRenameModal();
    try {
      var res = await fetch(
        "/api/v2/servers/" + encodeURIComponent(serverId) + "/files/rename",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": getCsrfToken(),
          },
          body: JSON.stringify({ file: filePath, newname: newPath }),
        },
      );
      if (res.ok) {
        notify("success", "Renamed.");
        refreshFileList();
      } else {
        notify("error", "Failed to rename");
      }
    } catch {
      notify("error", "Failed to rename");
    }
  }

  // ── Pull from URL ──────────────────────────────────────────────────────
  function openPullFileModal() {
    document.getElementById("pullUrlInput").value = "";
    document.getElementById("pullUrlPreview").classList.add("hidden");
    openModal("pullFileModal", "pullFileModalPanel");
    document.getElementById("pullUrlInput").focus();
  }

  function closePullFileModal() {
    closeModal("pullFileModal", "pullFileModalPanel");
  }

  // ── Mass delete ────────────────────────────────────────────────────────
  function openMassDeleteModal() {
    document.getElementById("massDeleteMessage").textContent =
      "Are you sure you want to delete " +
      selectedFiles.length +
      " file(s)? This is permanent.";
    openModal("massDeleteModal", "massDeleteModalPanel");
  }

  function closeMassDeleteModal() {
    closeModal("massDeleteModal", "massDeleteModalPanel");
  }

  async function confirmMassDelete() {
    closeMassDeleteModal();
    var deletePromises = selectedFiles.map(function (fileName) {
      return fetch(
        "/api/v2/servers/" +
          encodeURIComponent(serverId) +
          "/files?path=" +
          encodeURIComponent(fileName),
        {
          method: "DELETE",
          headers: { "x-csrf-token": getCsrfToken() },
        },
      );
    });
    try {
      await Promise.all(deletePromises);
      notify("success", "Files deleted.");
      refreshFileList();
    } catch {
      notify("error", "Failed to delete files");
    }
  }

  // ── Mass archive ───────────────────────────────────────────────────────
  function archiveFiles(files) {
    fetch("/api/v2/servers/" + encodeURIComponent(serverId) + "/files/zip", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify({ files: files, target: "archive" }),
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        if (data.success) {
          selectedFiles = [];
          updateSelectedFiles();
          refreshFileList();
          notify("success", "Archive created!");
        } else {
          notify("error", "Failed to archive files");
        }
      })
      .catch(function () {
        notify("error", "Something went wrong.");
      });
  }

  // ── Dismiss selection ──────────────────────────────────────────────────
  function dismissSelection() {
    document.querySelectorAll(".file-checkbox").forEach(function (cb) {
      cb.checked = false;
      var row = cb.closest("tr");
      if (row) row.classList.remove("is-selected");
    });
    selectedFiles = [];
    updateSelectedFiles();
  }

  // ── File search/filter ─────────────────────────────────────────────────
  function initFileSearch() {
    var input = document.getElementById("fileSearchInput");
    var clearBtn = document.getElementById("clearFileSearch");
    if (!input) return;

    function applyFilter(q) {
      document.querySelectorAll("tbody tr.al-file-row").forEach(function (row) {
        var name = (
          row.querySelector("td:nth-child(2)")?.textContent || ""
        ).toLowerCase();
        row.style.display = !q || name.includes(q) ? "" : "none";
      });
    }

    input.addEventListener("input", function () {
      var q = input.value.toLowerCase().trim();
      clearBtn.classList.toggle("hidden", !q);
      applyFilter(q);
    });

    clearBtn.addEventListener("click", function () {
      input.value = "";
      input.dispatchEvent(new Event("input"));
      input.focus();
    });
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────
  document.addEventListener("keydown", function (e) {
    if (
      (e.ctrlKey || e.metaKey) &&
      e.key === "a" &&
      !e.target.closest("input, textarea")
    ) {
      e.preventDefault();
      document.querySelectorAll(".file-checkbox").forEach(function (cb) {
        cb.checked = true;
        var row = cb.closest("tr");
        if (row) row.classList.add("is-selected");
        var name = cb.dataset.filename;
        if (name && !selectedFiles.includes(name)) selectedFiles.push(name);
      });
      updateSelectedFiles();
    }
    if (e.key === "Escape" && selectedFiles.length > 0) {
      dismissSelection();
    }
    if (
      e.key === "Delete" &&
      selectedFiles.length > 0 &&
      !e.target.closest("input, textarea")
    ) {
      document.getElementById("massDeleteBtn")?.click();
    }
  });

  // ── Event bindings ─────────────────────────────────────────────────────
  document
    .getElementById("createFile")
    ?.addEventListener("click", openCreateFileModal);
  document
    .getElementById("createFolder")
    ?.addEventListener("click", openCreateFolderModal);
  document.getElementById("uploadFile")?.addEventListener("click", function () {
    if (typeof window.openUploadModal === "function") {
      window.openUploadModal({ title: "Upload file" });
    }
  });
  document
    .getElementById("pullFile")
    ?.addEventListener("click", openPullFileModal);
  document
    .getElementById("refreshFiles")
    ?.addEventListener("click", refreshFileList);
  document
    .getElementById("closeCreateFileModal")
    ?.addEventListener("click", closeCreateFileModal);
  document
    .getElementById("cancelCreateFile")
    ?.addEventListener("click", closeCreateFileModal);
  document
    .getElementById("confirmCreateFile")
    ?.addEventListener("click", confirmCreateFile);
  document
    .getElementById("FileName")
    ?.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmCreateFile();
      }
    });
  document
    .getElementById("closeRenameModal")
    ?.addEventListener("click", closeRenameModal);
  document
    .getElementById("cancelRename")
    ?.addEventListener("click", closeRenameModal);
  document
    .getElementById("confirmRename")
    ?.addEventListener("click", confirmRename);
  document
    .getElementById("newFileName")
    ?.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmRename();
      }
    });
  document
    .getElementById("closePullFileModal")
    ?.addEventListener("click", closePullFileModal);
  document
    .getElementById("cancelPullFile")
    ?.addEventListener("click", closePullFileModal);
  document
    .getElementById("pullButton")
    ?.addEventListener("click", async function () {
      var url = document.getElementById("pullUrlInput").value.trim();
      if (!url) {
        notify("error", "Enter a file URL.");
        return;
      }
      var parsed;
      try {
        parsed = new URL(url);
      } catch {
        notify("error", "Invalid URL.");
        return;
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        notify("error", "Only http(s) URLs are allowed.");
        return;
      }
      closePullFileModal();
      try {
        var res = await fetch(
          "/api/v2/servers/" + encodeURIComponent(serverId) + "/files/pull",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-csrf-token": getCsrfToken(),
            },
            body: JSON.stringify({ url: url, path: currentPath }),
          },
        );
        var data = await res.json();
        if (res.ok && data.success) {
          notify("success", data.message || "File pulled.");
          refreshFileList();
        } else {
          notify("error", data.error || "Failed to pull file.");
        }
      } catch {
        notify("error", "Failed to pull file.");
      }
    });
  document
    .getElementById("dismissSelectionBtn")
    ?.addEventListener("click", dismissSelection);
  document
    .getElementById("massDeleteBtn")
    ?.addEventListener("click", openMassDeleteModal);
  document
    .getElementById("closeMassDeleteModal")
    ?.addEventListener("click", closeMassDeleteModal);
  document
    .getElementById("cancelMassDelete")
    ?.addEventListener("click", closeMassDeleteModal);
  document
    .getElementById("confirmMassDelete")
    ?.addEventListener("click", confirmMassDelete);
  document
    .getElementById("massArchiveBtn")
    ?.addEventListener("click", function () {
      if (selectedFiles.length > 0) {
        window.modal.confirm({
          title: "Confirm Archive",
          body: "Archive " + selectedFiles.length + " selected file(s)?",
          danger: false,
          confirmLabel: "Archive",
          onConfirm: function () {
            archiveFiles(selectedFiles);
          },
        });
      }
    });
  document
    .getElementById("massRenameBtn")
    ?.addEventListener("click", function () {
      if (selectedFiles.length !== 1) {
        notify("error", "Select exactly one file to rename");
        return;
      }
      var fullPath = selectedFiles[0];
      var name = fullPath.split("/").pop();
      openRenameModal(name, fullPath);
    });

  // ── Init ───────────────────────────────────────────────────────────────
  bindRowEvents(document);
  updateSelectedFiles();
  initFileSearch();
})();
