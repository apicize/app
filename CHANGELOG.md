# Change Log

# 0.30.0

* Restore log viewer follow
* Use Password mask on sensitive text inputs

# 0.29.13

* Performance improvements on result viewer, log viewer and theme processing

# 0.29.12

* Add erase per-request results
* Fix warning clearing on multiple windows
* Hide _id from CSV editor

# 0.29.11

* Add stylized scroll bars
* Set "dirty" on request body change

# 0.29.10

* Fix 'save data set as'

# 0.29.9

* Fix request test update/save

# 0.29.8

* Fix PATCH calls
* Refine external file handling
* Standardize data set source error handling

# 0.29.7

* Tune data set file persistence, update demo files

# 0.29.6

* Move DataSets to main navigation, include file editors
* Performance improvements

# 0.29.5

* Fix resize observer bug on Windows when multiple Monaco editors are displayed

# 0.29.4

* Improve body type conversions
* Add request body clipboard copy
* Fix backdrop crash hiding on closing modals

# 0.29.3

* Fix final result navigation "prev" button
* Set children to None when serializing/deserializing empty result children lists
* Fix raw body load from clipboard and file

# 0.29.2

* Performance improvements

# 0.29.1

* Fix result navigation buttons
* Show run/row in navigation individual result menu items

# 0.29.0

* Store and display execution results per-executing request
* Add execution result success/failure filters

# 0.28.6

* Restore header/query string functionality that was broken by AI

# 0.28.5

* Standardize Monaco editor font size (remove 20% increase)

# 0.28.4

* Switched to Roboto Flex for font
* Small tweaks to navigation bar

# 0.28.3

* Support setting request and group runs to zero

# 0.28.2

* Standardize Cancellation handling

# 0.28.1

* Fix Basic Authorization validation

# 0.28.0

* Remove Zephyr report format
* README.md updates

# 0.27.1

* Enable Monaco autoLayout option

# 0.27.0

* Claude-suggested optimizations

# 0.26.1

* Address resizing issues with code editors
* Centrallize polling when detecting if settings are ready to save

# 0.26.0

* Add Key property support for requests and groups
* Fix many (but not all) font sizing issues
* Add diagnostic directory information

# 0.25.5

* Fix Zephyr report to say "Passed" instead of "Success"

# 0.25.4

* Throw error if invalid property specified in tag handlebar

# 0.25.3

* Allow handlebars in tag names to pull in values (data, scenario, output)

# 0.25.2

* Update Zephyr output to only include tagged entries

# 0.25.1

* Allow PKCE port to be set to zero, disabling PKCE
* Show global and settings file locations in Settings panel
* Fix clearing of error icon in navigation

# 0.25.0

* Allow specifying format type when copying execution information to clipboard
* Moved settings saving poll to main panel


# 0.25.0

* Add "tag" test function to store tag with executed tests
* Include URL and tag in execution results
* Fix panel swap on adding new data source


# 0.24.4

* Fix saving of allow invalid certs option
* Fix names of selected auth, certs, etc. when updated

# 0.24.3

* Clear workbook tokens on close
* Add jp/JsonPath autocomplete to test editor
* Improve detection of JSON and XML response bodies

# 0.24.2

* Restore final save warning on close

# 0.24.1

* Restore drag/drop on body editor
* Remove development context menu

# 0.24.0

* Auto-complete in test editor
* Adding settings for some editor configuration

# 0.23.2

* Restore base64 conversion for detail view of binary data

# 0.23.1

* Disable in-use keyboard shortcuts in monaco editor
* Fix new workspace (open in existing window)
* Restore PKCE functionality
* Include HTML editor language

# 0.23.0

* Switch to Monaco editor and use Webpack for build

# 0.22.1

* Restore serialization for default runs and redirects

# 0.22.0

* Support keep alive, allow invalid certs and number of redirect options

# 0.21.2

* Fix populating form data
* Add substitution to test text

# 0.21.1

* Fix populating form data

# 0.21.0

* Add CSV reporting output

# 0.20.5

* Fix public credentials warning
* Disable keyboard handling on TreeView (until we can make it work sensibly)
* Update @Mui libraries
* Add validation errors and restore warning (parameter selection) functionality

# 0.20.4

* Adjust window sizing to take into account scale factor

# 0.20.3

* Added check to prevent Save As over another opened workspace
* Removed window state plugin for now, it doesn't work as required
* Updated help screens

# 0.20.2

* Consolidate nested test scenario messaging
* Adjust initial window size to take into account scaling

# 0.20.1

* Fix navigation request menu reactivity

# 0.20.0

* Allow data to be assigned at the group/request level
* Add "output" to test context
* Organize request detail to show test context variables
* Improved synchronization of open windows
* Improved new window placement
* Formatting clean-up of response summary

### Regressions / Known Issues

* Tree keyboard navigation does not work well, keyboard accessibility in general needs work
* Warnings (display and clearing) have not yet been added back in
* Multi-window seems (as C3P0 would say) not entire stable.  Use with caution and save often.

# 0.19.3

* Show window only when ready to be displayed
* Consolidate new/open window routines
* Update request defaults when workspace defaults are changed

# 0.19.2

* Clean up some formatting bugs
* Retain communications log in new windows
* Refactor/tune window initialization and startup

# 0.19.1

* Small visual fixes on navigation, results viewer and comm log

# 0.19.0

* Return test results as a hierarchy of scenarios/behaviors

# 0.18.1

* Include updated lib to prioritize scenario and data variables over previous run results
* Fix move group
* Fix body update header

# 0.18.0

* Multi-window
* Refactor workspace management to Rust

# 0.17.6

* Fix log viewer width

# 0.17.5

* Fix bug with consecutive executed results display

# 0.17.4

* Persist Navigation text size

# 0.17.3

* Add drag-drop file support for request bodies and test
* Reduce base64/uint8 conversions
* Refactor stores to prepare for multi-window support

# 0.17.2

* Add Audience and Send Credentials in Body to OAuth2
* Fix Communication Log width
* Expand group when moving request/group to it

# 0.17.1

* Fix seed data icon
* Update Demo example

# 0.17.0

* Add Seed data support
* Add compact navigation

# 0.16.4

* Store JSON data files in "pretty" format
* Remove support for "formatted" property on JSON body data, beautify on load instead

# 0.16.3

* Replaced react-ace in preparation for ace-linter integration

# 0.16.2

* Restore padding removal on tree items

# 0.16.1

* Fix error on loading defaults

# 0.16.0

* Add reqwest trace logging

# 0.15.2

* Reorganization of UI and Workspace to break out public, private and global/vault parameters

# 0.12.0

* Added PKCE Authorization

# 0.11.4

* Copy selections when copying request/groups

# 0.11.3

* Improve OAuth2 diagnostic info

# 0.11.2

* Fix globals clearing on new workspace open

# 0.11.1

* Refine details view

# 0.11.0

* Update lib_rust to fix issue with opening workbooks showing false warnings with any selection set to None
* Fix JSON and XML "beautification" in body editor
* Repurpose "Request" results tab to show details, including the execution context available for testing (request, response and variables)
* Set monospace fonts to Roboto Mono

# 0.10.1

* Make failed request error text an easier-to-read red in dark mode
* Remove failed workspace files from recent workbook list

# 0.10.0

* Added modal block when opening file dialog
* Added recent workbook list
* Fixed request timeout
* Moved settings load to app setup (begin work on multiwindow)

# 0.9.5

* Updated to apicize_lib to 0.12.0
* Some refinement of request screen splitter

# 0.9.4

* UI Tweak: Disable result information on run

# 0.9.3

* Fix MacOS GitHub pipeline
* Minor doc updates

# 0.9.2

* Sign Windows distributable using Azure Trusted Signing

# 0.9.1

* Updated aplicize_lib to 0.11.3, which will hopefully fix the Windows build issue
* Honor theme settings in request test editor

# 0.9.0

* Updated aplicize_lib to 0.11.1

# 0.8.5

* Moved CLI to its own project
* Hide results while running request/group
* Wordwrap formatted results

# 0.8.4

* Add private/local global icons for parameter storage

# 0.8.3

* Fix request cloning when body has data
* Add request body beautification for JSON/XML

# 0.8.2

* Fix Run result dropdown formatting, more prep to spin off lib-rust

# 0.8.1

* Move child projects to from @apicize/ to apicize/ folder for prepreation of crates.io publish and monorepo breakup

# 0.8.0

* Overhaul of sequential/concurrent handling for requests and groups
* UI enhancement

# 0.7.1

* Switch to splitter view of request/ersponse
* Fix certificate and proxy validation
* Other UI cleanup

# 0.7.0

* Get rid of x-data-grid

# 0.6.11

* Fix variable substitution issue on requests

# 0.6.10

* Add Clippy/lint to pipeline and clean up

# 0.6.9

* Display warning on save if any auths or certs are stored directly in Workbook (not priv or local global)

# 0.6.8

* Display warnings when specified parameters are not found in private or global files

# 0.6.7

* Added STDIN/STDOUt support to CLI
* Fixed multi-run output in GUI
* Added some additional help content

# 0.6.6

* Added output file name parameter to CLI
* Prevented inheritance of parameters when value is set

# 0.6.5

* Add in workbook parameter defaults
* Move workbook defaults and global settings to a navigation item

# 0.6.4

* Return product name back to sentence case

# 0.6.3

* Set log timestamps as relative to start of execution

# 0.6.2

* Add deployment packages for CLI

# 0.6.1

* Fix help screen in light mode
* Improve results dropdown

# 0.6.0

* Tauri 2.0 release
* Improved nested group handling
* Updated CLI to use color formatting and arg parsing

# 0.5.12

* Configurable text size and light/dark scheme

# 0.5.11

* Navigation UI tuning

# 0.5.10

* Set clipboard to use interim event in v2-yarn-friendly branch

# 0.5.9

* Fix duplicate scenario and certificate
* Fix test result log word wrap

# 0.5.8

* Copy demo to documents directory upon creation
* Add check for config director

# 0.5.7

* Fix OAuth expiration detection
* Fix OAuth token clearing
* Acccessibility enhancements

# 0.5.6

* Migrate toast/confirm states from useState to mobx

# 0.5.5

* Fix "dirty" close dialog for release build

# 0.5.4

* Fix "Off" cascading parameters
* Update Tauri clipboard plugin to include large clipboard content fix

# 0.5.3

* Update Tauri CLI and other dependencies

# 0.5.2

* Restore hot keys, fix auth editor formatter

# 0.5.1

* Misc Bug Fixes

# 0.5.0

* Complete migration from Redux to mobx
* Clean up contexts/providers

# 0.4.3

* Fix close applciation warning on pending changes
* Restore clipboard image paste, since it appears to be working again

# 0.4.2

* Update open to work with changed Tauri dialog interface
* Fix request naviagation item insertion/moving
* Update group summary to scrollable view

# 0.4.1

* Fix run toolbar updating

# 0.4.0

* Migrate to Mobx

# 0.2.0

* Refactor to work with Tauri v2

# 0.1.0

* Initial attempt under Tauri v1