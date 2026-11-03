app_name = "item_code_finder"
app_title = "Item Code Finder"
app_publisher = "bizmap"
app_description = "icf"
app_email = "chaudhariparitosh9571@gmail.com"
app_license = "mit"

# Apps
# ------------------

required_apps = ["erpnext"]

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "item_code_finder",
# 		"logo": "/assets/item_code_finder/logo.png",
# 		"title": "Item Code Finder",
# 		"route": "/item_code_finder",
# 		"has_permission": "item_code_finder.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/item_code_finder/css/item_code_finder.css"
# app_include_js = "/assets/item_code_finder/js/item_code_finder.js"

# include js, css files in header of web template
# web_include_css = "/assets/item_code_finder/css/item_code_finder.css"
# web_include_js = "/assets/item_code_finder/js/item_code_finder.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "item_code_finder/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "item_code_finder/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "item_code_finder.utils.jinja_methods",
# 	"filters": "item_code_finder.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "item_code_finder.install.before_install"
# after_install = "item_code_finder.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "item_code_finder.uninstall.before_uninstall"
# after_uninstall = "item_code_finder.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "item_code_finder.utils.before_app_install"
# after_app_install = "item_code_finder.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "item_code_finder.utils.before_app_uninstall"
# after_app_uninstall = "item_code_finder.utils.after_app_uninstall"

# Build
# ------------------
# To hook into the build process

# after_build = "item_code_finder.build.after_build"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "item_code_finder.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"item_code_finder.tasks.all"
# 	],
# 	"daily": [
# 		"item_code_finder.tasks.daily"
# 	],
# 	"hourly": [
# 		"item_code_finder.tasks.hourly"
# 	],
# 	"weekly": [
# 		"item_code_finder.tasks.weekly"
# 	],
# 	"monthly": [
# 		"item_code_finder.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "item_code_finder.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "item_code_finder.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "item_code_finder.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "item_code_finder.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["item_code_finder.utils.before_request"]
# after_request = ["item_code_finder.utils.after_request"]

# Job Events
# ----------
# before_job = ["item_code_finder.utils.before_job"]
# after_job = ["item_code_finder.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"item_code_finder.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

