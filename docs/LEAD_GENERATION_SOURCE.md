# ServiceTitan Lead Generation KPI source

Lead Conversion is not sourced from the individual technician detail page.

The confirmed ServiceTitan UI source is the company/home performance overview under **Lead Generation**, which presents rows by employee/technician with these columns:

- `# Opps`
- `Leads Set`
- `Conv Rate`
- `Avg Sale`

`Conv Rate` is therefore employee-row data exposed from the overview dataset, even though it is not present on each technician's detail page.

The dashboard should only expose Lead Conversion after the backend has a confirmed mapping to this Lead Generation overview dataset. Do not substitute the technician-detail `leadConversionRate` placeholder or invent a value from unrelated fields.
