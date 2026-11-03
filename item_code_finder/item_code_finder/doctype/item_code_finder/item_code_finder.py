# Copyright (c) 2026, bizmap and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document
import frappe
import json
from collections import defaultdict
from frappe.model.document import Document
from frappe.utils import flt



class ItemCodeFinder(Document):
	pass



@frappe.whitelist()
def find_item_variant(item_group, attributes):
    if isinstance(attributes, str):
        attributes = json.loads(attributes)

    if not attributes:
        return None

    # Get numeric attributes
    numeric_attrs = set(
        frappe.get_all(
            "Item Attribute",
            filters={"numeric_values": 1},
            pluck="name"
        )
    )

    # Normalize input attributes
    attr_map = {}
    for a in attributes:
        attr = a.get("attribute")
        val = a.get("value")

        if attr in numeric_attrs:
            attr_map[attr] = flt(val, 3)
        else:
            attr_map[attr] = val

    expected_attr_count = len(attr_map)

    # 🔥 TEMPLATE VIA SUB CATEGORY
    templates = frappe.get_all(
        "Item",
        filters={
            "item_group": item_group,
            "has_variants": 1
        },
        pluck="name"
    )

    if not templates:
        return {"no_template": 1}

    template_item = templates[0]

    # Get variants
    variants = frappe.get_all(
        "Item",
        filters={"variant_of": template_item},
        fields=["name", "item_code", "item_name", "variant_of"]
    )

    if not variants:
        return {"variant_of": template_item}

    variant_names = [v.name for v in variants]

    variant_attrs = frappe.get_all(
        "Item Variant Attribute",
        filters={"parent": ["in", variant_names]},
        fields=["parent", "attribute", "attribute_value"]
    )

    grouped = defaultdict(dict)
    for row in variant_attrs:
        grouped[row.parent][row.attribute] = row.attribute_value

    for variant in variants:
        attrs = grouped.get(variant.name, {})

        if len(attrs) != expected_attr_count:
            continue

        match = True
        for attr, expected_val in attr_map.items():
            db_val = attrs.get(attr)

            if attr in numeric_attrs:
                if flt(db_val, 3) != flt(expected_val, 3):
                    match = False
                    break
            else:
                if db_val != expected_val:
                    match = False
                    break

        if match:
            return {
                "item_code": variant.item_code,
                "item_name": variant.item_name,
                "variant_of": variant.variant_of
            }

    return {"variant_of": template_item}




# Findding based on attributes selected and button click 

@frappe.whitelist()
def search_variants(item_group, attributes):
    """
    Find item variants matching ONLY provided attributes
    """
    if isinstance(attributes, str):
        attributes = json.loads(attributes)

    if not attributes:
        return []

    # Get all variants under this item group
    items = frappe.get_all(
        "Item",
        filters={
            "item_group": item_group,
            "has_variants": 0,
            "variant_of": ["is", "set"]
        },
        fields=["name", "item_name"]
    )
    
    # CASE: No items exist in this subcategory
    if not items:
        return {
            "no_items": 1
        }

    matched_items = []

    for item in items:
        item_doc = frappe.get_doc("Item", item.name)

        variant_attrs = {
            d.attribute: normalize_value(d)
            for d in item_doc.attributes
        }

        is_match = True
        for f in attributes:
            attr = f["attribute"]
            val = normalize_input_value(attr, f["value"])

            if variant_attrs.get(attr) != val:
                is_match = False
                break

        if is_match:
            matched_items.append({
                "item_code": item_doc.name,
                "item_name": item_doc.item_name
            })

    return matched_items


def normalize_value(row):
    """Normalize stored variant value"""
    attr = frappe.get_doc("Item Attribute", row.attribute)

    if attr.numeric_values:
        return float(row.attribute_value)
    return str(row.attribute_value)


def normalize_input_value(attribute, value):
    """Normalize user input value"""
    attr = frappe.get_doc("Item Attribute", attribute)

    if attr.numeric_values:
        return float(value)
    return str(value)


@frappe.whitelist()
def get_variant_template(item_group):
    template = frappe.get_value(
        "Item",
        {
            "item_group": item_group,
            "has_variants": 1
        },
        "name"
    )
    return template



# AUTO INCREMENT VALUE

@frappe.whitelist()
def process_auto_increment_attributes(attribute_json):
    import json

    data = json.loads(attribute_json)

    for d in data:
        if not d.get("attribute"):
            continue

        item_attr = frappe.get_doc("Item Attribute", d["attribute"])

        if not item_attr.custom_is_auto_increment_:
            continue

        value = d.get("value")

        # ✅ correct empty check
        if value in [None, "", 0]:

            last_value = frappe.db.sql("""
                SELECT attribute_value 
                FROM `tabItem Attribute Value`
                WHERE parent=%s
                ORDER BY CAST(attribute_value AS UNSIGNED) DESC
                LIMIT 1
            """, (d["attribute"]), as_dict=1)

            if last_value:
                try:
                    new_value = int(last_value[0].attribute_value) + 1
                except:
                    frappe.throw(f"Last value for {d['attribute']} is not numeric")
            else:
                new_value = 1

            d["value"] = str(new_value)
            # d["auto_generated"] = 1
            
            new_val_str = str(new_value)

            # save new value
            item_attr.append("item_attribute_values", {
                "attribute_value": str(new_value),
                "abbr":new_val_str
                
            })
            item_attr.save(ignore_permissions=True)

        # else:
        #     d["auto_generated"] = 0

    return json.dumps(data)