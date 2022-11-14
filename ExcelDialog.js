'use strict';

/**
 * UINamespace Sample Extension
 *
 * This is the popup extension portion of the UINamespace sample, please see
 * uiNamespace.js in addition to this for context.  This extension is
 * responsible for collecting configuration settings from the user and communicating
 * that info back to the parent extension.
 *
 * This sample demonstrates two ways to do that:
 *   1) The suggested and most common method is to store the information
 *      via the settings namespace.  The parent can subscribe to notifications when
 *      the settings are updated, and collect the new info accordingly.
 *   2) The popup extension can receive and send a string payload via the open
 *      and close payloads of initializeDialogAsync and closeDialog methods.  This is useful
 *      for information that does not need to be persisted into settings.
 */

// Wrap everything in an anonymous function to avoid polluting the global namespace
(function () {
  /**
   * This extension collects the IDs of each datasource the user is interested in
   * and stores this information in settings when the popup is closed.
   */
  const datasourcesSettingsKey = 'selectedDatasources';
  let selectedDatasources = [];

  $(document).ready(function () {
    // The only difference between an extension in a dashboard and an extension
    // running in a popup is that the popup extension must use the method
    // initializeDialogAsync instead of initializeAsync for initialization.
    // This has no affect on the development of the extension but is used internally.
    tableau.extensions.initializeDialogAsync().then(function (openPayload) {
      // The openPayload sent from the parent extension in this sample is the
      // default time interval for the refreshes.  This could alternatively be stored
      // in settings, but is used in this sample to demonstrate open and close payloads.
      $('#interval').val(openPayload);
      $('#closeButton').click(closeDialog);
      $('#showData').click(showData);

      const dashboard = tableau.extensions.dashboardContent.dashboard;
      const visibleDatasources = [];
      // selectedDatasources = parseSettingsForActiveDataSources();
      selectedDatasources = [];

      // Loop through datasources in this sheet and create a checkbox UI
      // element for each one.  The existing settings are used to
      // determine whether a datasource is checked by default or not.
      dashboard.worksheets.forEach(function (worksheet) {
        const isActive = selectedDatasources.indexOf(worksheet.name) >= 0;

        if (visibleDatasources.indexOf(worksheet.name) < 0 & worksheet.name.includes('*')) {
          addDataSourceItemToUI(worksheet, isActive);
          visibleDatasources.push(worksheet.name);
        }
      });
    });
  });

  /**
   * Helper that updates the internal storage of datasource IDs
   * any time a datasource checkbox item is toggled.
   */
  function updateDatasourceList (id) {
    const idIndex = selectedDatasources.indexOf(id);
    if (idIndex < 0) {
      selectedDatasources.push(id);
    } else {
      selectedDatasources.splice(idIndex, 1);
    }
  }

  /**
   * UI helper that adds a checkbox item to the UI for a datasource.
   */
  function addDataSourceItemToUI (datasource, isActive) {
    const containerDiv = $('<div />');

    $('<input />', {
      type: 'radio',
      id: datasource.name,
      name: 'Sheet',
      value: datasource.name,
      checked: isActive,
      click: function () {
        updateDatasourceList(datasource.name);
      }
    }).appendTo(containerDiv);

    $('<label />', {
      for: datasource.name,
      text: datasource.name.replace('*', '')
    }).appendTo(containerDiv);

    $('#datasources').append(containerDiv);
  }

  /**
   * Stores the selected datasource IDs in the extension settings,
   * closes the dialog, and sends a payload back to the parent.
   */
  function closeDialog () {
    tableau.extensions.settings.set(datasourcesSettingsKey, JSON.stringify(selectedDatasources));

    tableau.extensions.settings.saveAsync().then((newSavedSettings) => {
      tableau.extensions.ui.closeDialog($('#interval').val());
    });
  }

  function showData () {
    // Get the worksheet object we want to get the selected marks for
    const worksheet = getSelectedSheet(selectedDatasources[0]);

    // Call to get the selected marks for our sheet
    worksheet.getSummaryDataAsync({ maxRows: 50000 }).then(function (marks) {
      // Map our data into the format which the data table component expects it
      const columns = marks.columns.map(function (column) {
        return column.fieldName;
      });

      const datatest = marks.data.map(function (row) {
        const rowData = row.map(function (cell, index) {
          return {
            [columns[index]]: cell.formattedValue.replace(',', '')
          };
        });

        const objtemp = {};
        rowData.forEach(function (value) {
          objtemp[Object.keys(value)] = Object.values(value)[0];
        });
        return objtemp;
      });
      // $('#showDataMessage').append(JSON.stringify(datatest));
      const csvdata = csvmaker(datatest);
      // $('#showDataMessage').append(JSON.stringify(csvdata));
      download(csvdata, worksheet.name);
      closeDialog();
    });
    $('#showDataMessage').append(worksheet.name);
    // tableau.extensions.ui.closeDialog();
  }

  const download = function (data, sheetName) {
    // Creating a Blob for having a csv file format
    // and passing the data with type
    const blob = new Blob([data], { type: 'text/csv' });

    // Creating an object for downloading url
    const url = window.URL.createObjectURL(blob);

    // Creating an anchor(a) tag of HTML
    const a = document.createElement('a');

    // Passing the blob downloading url
    a.setAttribute('href', url);

    // Setting the anchor tag attribute for downloading
    // and passing the download file name
    a.setAttribute('download', sheetName.replace('*', '').concat('.csv'));

    // Performing a download with click
    a.click();
  };

  const csvmaker = function (data) {
    // Empty array for storing the values
    const csvRows = [];

    // Headers is basically a keys of an
    // object which is id, name, and
    // profession
    const headers = Object.keys(data[0]);

    // As for making csv format, headers
    // must be separated by comma and
    // pushing it into array
    csvRows.push(headers.join(','));

    // Pushing Object values into array
    // with comma separation
    data.forEach(function (value) {
      const values = Object.values(value).join(',');
      csvRows.push(values);
    });

    // Returning the array joining with new line
    return csvRows.join('\n');
  };

  function getSelectedSheet (worksheetName) {
    // Go through all the worksheets in the dashboard and find the one we want
    return tableau.extensions.dashboardContent.dashboard.worksheets.find(function (sheet) {
      return sheet.name === worksheetName;
    });
  }
})();
