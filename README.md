# 💰 tax-map 💰

Have you ever gotten extremely frustrated filling out an IRS tax form? I sure have. This project provides a visualization of our tax code complexity
by graphing references between different tax forms.

[Play around with the graph here](https://nampas.github.io/tax-map/).

![Image of Website](/docs/website.jpg)

## Details

This project shows IRS form references via a directed graph. Nodes represent IRS documents (forms and schedules), and edges represent references.
There are a number of reasons two documents might be joined by an edge. In most cases, an edge from Document X to Document Y indicates that Document X
is dependent on a line from Document Y (e.g. "Enter the amount of all taxes from Schedule A (Form 1040 or 1040-SR), line 7"). In other cases,
an edge indicates that Document Y should be filed instead of (or in addition to) Document X.

