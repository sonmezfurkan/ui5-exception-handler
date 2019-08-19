## ExceptionManager

**Extends sap.ui.base.Object**

Handles OData messages by attaching model events and catching & displaying messages

### Parameters

-   `oComponent` **sap.ui.core.UIComponent** Reference to the app's component
-   `mSettings` **[Object]?** Initial settings for the new control

**Meta**

-   **author**: Furkan Soenmez

### setIntercept

Sets intercept property
If set to true, the user is intercepted with a dialog or a message box

#### Parameters

-   `bValue` **[boolean]** 

### setErrorOnly

Sets error only property
If set to true, only messages with severity error are taken into account

#### Parameters

-   `bValue` **[boolean]** 

### setErrorText

Sets leading error text

#### Parameters

-   `bValue` **[string]** 

### setDialogTitle

Sets message dialog title

#### Parameters

-   `bValue` **[string]** 
