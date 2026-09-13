(function () {
  const apiKeyInput = document.getElementById("airlinkCloudApiKey");
  const backupToggle = document.getElementById("airlinkCloudBackupEnabled");

  let savedKey = apiKeyInput.value;
  let savedEnabled = backupToggle.checked;

  document
    .getElementById("saveBtn")
    .addEventListener("click", async function () {
      const data = await Api.admin.settings.updateAirlinkCloud({
        airlinkCloudApiKey: apiKeyInput.value,
        airlinkCloudBackupEnabled: backupToggle.checked,
      });

      if (data && data.success) {
        showToast("Settings saved. Looking good.", "success");
        savedKey = apiKeyInput.value;
        savedEnabled = backupToggle.checked;
      }
    });

  document.getElementById("resetBtn").addEventListener("click", function () {
    apiKeyInput.value = savedKey;
    backupToggle.checked = savedEnabled;
    showToast("Changes discarded.", "info");
  });
})();
