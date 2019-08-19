sap.ui.define([
	"sap/ui/base/Object",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/m/MessageView",
	"sap/m/Dialog",
	"sap/ui/core/MessageType",
	"sap/ui/core/ValueState"
], function (UI5Object, JSONModel, MessageBox, MessageView, Dialog, MessageType, ValueState) {
	"use strict";

	// mapping constant that holds default settings for the control
	const DEFAULT_SETTINGS = {
		intercept: true,
		errorOnly: false,
		errorText: "Sorry, a technical error occurred! Please try again later.",
		dialogTitle: "Please check following message(s)",
		excluded: []
	};

	/**
	 * Handles OData messages by attaching model events and catching & displaying messages
	 * @class
	 * @extends sap.ui.base.Object
	 * @author Furkan Soenmez
	 * @param {sap.ui.core.UIComponent} oComponent Reference to the app's component
	 * @param {Object} [mSettings] Initial settings for the new control
	 * @alias ExceptionManager
	 * @constructor
	 * @public
	 */
	return UI5Object.extend("dbag.sapui5.utils.ExceptionManager",
	/** @lends ExceptionManager */
	{
		constructor: function(oComponent, mSettings = DEFAULT_SETTINGS) {

			// instance properties for initial settings
			// default values are assigned for properties that are not provided
			this._bIntercept 	= mSettings.hasOwnProperty('intercept') 	? mSettings.intercept 	: DEFAULT_SETTINGS.intercept;
			this._bErrorOnly 	= mSettings.hasOwnProperty('errorOnly') 	? mSettings.errorOnly 	: DEFAULT_SETTINGS.errorOnly;
			this._sErrorText 	= mSettings.hasOwnProperty('errorText') 	? mSettings.errorText 	: DEFAULT_SETTINGS.errorText;
			this._sDialogTitle 	= mSettings.hasOwnProperty('dialogTitle') 	? mSettings.dialogTitle : DEFAULT_SETTINGS.dialogTitle;
			this._aExcluded 	= mSettings.hasOwnProperty('excluded') 		? mSettings.excluded 	: DEFAULT_SETTINGS.excluded;

			// instance property to hold app's component
			this._oComponent = oComponent;

			// set message model to the component
            // this enables the automatic handling of message button in semantic page and field validation depending on message target
			// (can be overwritten in Component.js or view controllers by simply setting another model with the name 'message')
			this._oComponent.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");

			// private property to hold messages
			this._aMessages = [];

			// private flag property to determine weather the manager is open or not
			// should be false initially
			this._bManagerOpen = false;

			// attach model events to component's OData V2 models
			this._attachModelEvents();
		},

		/**
		 * Attaches events to {@link sap.ui.model.odata.v2.ODataModel} instances of the component
		 * If any model names are marked to be excluded, they will be ignored
		 * @private
		 */
		_attachModelEvents() {

			// get manifest entry for models
			const oModels = this._oComponent.getManifestEntry("/sap.ui5/models");

			// check at least one model is found
			if (!oModels) return;

			// get all OData V2 type models and ignore excluded models
			var aModels = Object.entries(oModels)
				.filter(([key, value]) => value instanceof sap.ui.model.odata.v2.ODataModel && !this._aExcluded.includes(key));

			if (!aModels.length && this._oComponent.getModel() && this._oComponent.getModel() instanceof sap.ui.model.odata.v2.ODataModel) {
				aModels.push(this._oComponent.getModel());
			}

			// attach message change event to models
			aModels.forEach(
				oModel => oModel.attachMessageChange(
					oEvent => this._handleMessageChange(oEvent.getParameters())
				)
			);
		},

		/**
		 * Adjusts messages returned from the model
		 * Displays message(s) to the user if requested (via setting the <intercept> property to <true>)
		 * @param {Object} oResponse response object included in the event object returned from back-end
		 * @private
		 */
		_handleMessageChange({ newMessages }) {

			// ignore message source that is appended to every exception response
			// if only error messages are requested, ignore other type of errors
			this._aMessages = newMessages
				.filter(message => message.code !== "/IWBEP/CX_MGW_BUSI_EXCEPTION")
				.filter(message => !this._bErrorOnly || message.type === MessageType.Error );


			// if interception is requested, we should display error messages depending on the message count
			// different controls are used to display single and multiple messages - as suggested by Fiori Design Guidelines
			if (this._bIntercept) {
				this[this._aMessages.length > 1 ? "_displayMulti" : "_displaySingle"]();
			}
		},

		/**
		 * Displays a {@link sap.m.MessageBox} with a single message - as suggested by Fiori Design Guidelines
		 * See Fiori Design Guidelines - <a href="https://experience.sap.com/fiori-design-web/messaging/">Message Handling</a>
		 * @private
		 */
		_displaySingle() {

			// do not display multiple message managers at once
			if (this._bManagerOpen || !this._aMessages.length) return;

			// set manager state to open
			this._bManagerOpen = true;

			// display generic message along with error detail returned by back-end
			MessageBox.error(this._sErrorText, {
				details: this._aMessages[0].message,
				actions: [MessageBox.Action.CLOSE],
				onClose: () => this._bManagerOpen = false	// set manager state to closed once the message box is closed
			});
		},

		/**
		 * Displays a {@link sap.m.MessageView} inside {@link sap.m.Dialog} with possible multiple messages - as suggested by Fiori Design Guidelines
		 * See Fiori Design Guidelines - <a href="https://experience.sap.com/fiori-design-web/messaging/">Message Handling</a>
		 * @private
		 */
		_displayMulti() {

			// do not display multiple message managers at once
			if (this._bManagerOpen || !this._aMessages.length) return;

			// set manager state to open
			this._bManagerOpen = true;

			// load message dialog
			this._loadMessageDialog();

			// display messages to user
			this._oMessageDialog.open();
		},

		/**
		 * Loads a dialog control wrapping a message view control, lazily
		 * @private
		 */
		_loadMessageDialog() {

			// lazy load message view
			this._oMessageView = this._oMessageView || new MessageView({
				showDetailsPageHeader: true,
				items: {
					path: "/",
					template: new sap.m.MessageItem({
						type: "{type}",
						title: "{message}",
						description: "{additionalText}"
					})
				}
			});

			// set message view model
			this._oMessageView.setModel(new JSONModel(this._aMessages));

			// lazy load dialog to wrap message view
			this._oMessageDialog = this._oMessageDialog || new Dialog({
				resizable			: true,
				content				: this._oMessageView,
				state				: this._aMessages.some(message => message.type === MessageType.Error) ? ValueState.Error : ValueState.Warning,
				title				: this._sDialogTitle,
				contentHeight		: "300px",
				contentWidth		: "500px",
				verticalScrolling	: false,
				endButton			: new sap.m.Button({ text: "Close", press: () => this._oMessageDialog.close() }),
				afterClose			: () => this._bManagerOpen = false	// set manager state to closed once the message box is closed
			});
		},

		/**
		 * Sets intercept property
		 * If set to true, the user is intercepted with a dialog or a message box
		 * @memberof ExceptionManager
		 * @param {boolean} bValue
		 * @instance
		 * @function
		 * @public
		 */
		setIntercept(bValue) {
			this._bIntercept = bValue;
		},

		/**
		 * Sets error only property
		 * If set to true, only messages with severity error are taken into account
		 * @memberof ExceptionManager
		 * @param {boolean} bValue
		 * @instance
		 * @method
		 * @public
		 */
		setErrorOnly(bValue) {
			this._bErrorOnly = bValue;
		},

		/**
		 * Sets leading error text
		 * @memberof ExceptionManager
		 * @param {string} bValue
		 * @instance
		 * @method
		 * @public
		 */
		setErrorText(sValue) {
			this._sErrorText = sValue || DEFAULT_SETTINGS.errorText;
		},

		/**
		 * Sets message dialog title
		 * @memberof ExceptionManager
		 * @param {string} bValue
		 * @instance
		 * @method
		 * @public
		 */
		setDialogTitle(sValue) {
			this._sDialogTitle = sValue || DEFAULT_SETTINGS.dialogTitle;
		}

	});
});
