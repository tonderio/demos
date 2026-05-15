import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

const _betxicoUrl =
    'https://api-payframe-dev.paybridge.com.mx/checkout/e0c88409-cc1c-4596-9455-7ddf1e6d95a9?token=768813573ef259368db35e8ad6b3b2e75ea8f14e560299352595d98a4104a491';

const _payframeSimulatorUrl =
    'https://main.d1o68oh85obv0k.amplifyapp.com/payframe-simulator/index.html';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  if (defaultTargetPlatform == TargetPlatform.android) {
    AndroidWebViewController.enableDebugging(true);
  }
  runApp(const CheckoutDemoApp());
}

class CheckoutDemoApp extends StatelessWidget {
  const CheckoutDemoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tonder Checkout Demo',
      theme: ThemeData(colorSchemeSeed: Colors.indigo, useMaterial3: true),
      home: const SessionFormScreen(),
    );
  }
}

// ─── Log model ───────────────────────────────────────────────────────────────

enum LogType { response, event, error }

class LogEntry {
  final LogType type;
  final DateTime time;
  final String title;
  final String body;

  LogEntry({
    required this.type,
    required this.time,
    required this.title,
    required this.body,
  });

  Color get color {
    switch (type) {
      case LogType.response:
        return Colors.green.shade700;
      case LogType.event:
        return Colors.indigo.shade600;
      case LogType.error:
        return Colors.red.shade700;
    }
  }

  Color get bgColor {
    switch (type) {
      case LogType.response:
        return Colors.green.shade50;
      case LogType.event:
        return Colors.indigo.shade50;
      case LogType.error:
        return Colors.red.shade50;
    }
  }

  String get typeLabel {
    switch (type) {
      case LogType.response:
        return 'RESPONSE';
      case LogType.event:
        return 'EVENT';
      case LogType.error:
        return 'ERROR';
    }
  }
}

// ─── Form screen ────────────────────────────────────────────────────────────

class SessionFormScreen extends StatefulWidget {
  const SessionFormScreen({super.key});

  @override
  State<SessionFormScreen> createState() => _SessionFormScreenState();
}

class _SessionFormScreenState extends State<SessionFormScreen> {
  final _formKey = GlobalKey<FormState>();

  final _apiKeyCtrl = TextEditingController(
    text: '2e3d13229122919c5acf5ec3bfce5a39a4ba89ff',
  );
  final _amountCtrl = TextEditingController(text: '150');
  final _emailCtrl = TextEditingController(text: 'test@tonder.io');
  final _firstNameCtrl = TextEditingController(text: 'Maria');
  final _lastNameCtrl = TextEditingController(text: 'Garcia');
  final _externalIdCtrl = TextEditingController(text: 'order-demo-001');

  final _availableMethods = ['card', 'oxxopay', 'spei'];
  final _selectedMethods = <String>{'card'};

  bool _isProd = false;
  bool _loading = false;
  String? _error;

  String get _baseUrl =>
      _isProd ? 'https://api.tonder.io' : 'https://api-stage.tonder.io';

  @override
  void dispose() {
    _apiKeyCtrl.dispose();
    _amountCtrl.dispose();
    _emailCtrl.dispose();
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _externalIdCtrl.dispose();
    super.dispose();
  }

  Future<void> _createSession() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final amount = double.parse(_amountCtrl.text.trim());
      final body = jsonEncode({
        'customer': {
          'first_name': _firstNameCtrl.text.trim(),
          'last_name': _lastNameCtrl.text.trim(),
          'email': _emailCtrl.text.trim(),
        },
        'amount_total': amount,
        'currency': 'MXN',
        'external_id': _externalIdCtrl.text.trim(),
        'metadata': {'order_id': _externalIdCtrl.text.trim()},
        'line_items': [
          {
            'name': 'Demo Product',
            'quantity': 1,
            'unit_price': amount,
            'product_id': 'demo-product-01',
          }
        ],
        'payment_method_types': _selectedMethods.toList(),
        'return_url': 'https://tonder.io',
        'checkout_type': 'embedded',
        'post_message_enabled': true,
        'redirect_on_completion': 'never',
      });

      final response = await http.post(
        Uri.parse('$_baseUrl/checkout/v1/sessions'),
        headers: {
          'Authorization': 'Token ${_apiKeyCtrl.text.trim()}',
          'Content-Type': 'application/json',
        },
        body: body,
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final url = data['url'] as String?;
        if (url == null || url.isEmpty) {
          throw Exception('No URL in response:\n${response.body}');
        }
        if (!mounted) return;
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => CheckoutWebViewScreen(
              url: url,
              sessionResponse: data,
            ),
          ),
        );
      } else {
        throw Exception('[${response.statusCode}]\n${response.body}');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openBetxico() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const CheckoutWebViewScreen(
          url: _betxicoUrl,
        ),
      ),
    );
  }

  void _openPayframeSimulator() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const CheckoutWebViewScreen(
          url: _payframeSimulatorUrl,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tonder Checkout Demo')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Text('Stage', style: TextStyle(fontSize: 13)),
                  Switch(
                    value: _isProd,
                    onChanged: (v) => setState(() => _isProd = v),
                  ),
                  const Text('Production', style: TextStyle(fontSize: 13)),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: _isProd
                          ? Colors.red.shade100
                          : Colors.green.shade100,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      _isProd ? 'api.tonder.io' : 'api-stage.tonder.io',
                      style: TextStyle(
                        fontSize: 11,
                        color: _isProd
                            ? Colors.red.shade800
                            : Colors.green.shade800,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              _Field(
                label: 'API Key',
                controller: _apiKeyCtrl,
                validator: _required,
              ),
              const SizedBox(height: 12),
              _Field(
                label: 'Amount (MXN)',
                controller: _amountCtrl,
                keyboardType: TextInputType.number,
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Required';
                  if (double.tryParse(v) == null) return 'Must be a number';
                  return null;
                },
              ),
              const SizedBox(height: 12),
              _Field(
                label: 'First Name',
                controller: _firstNameCtrl,
                validator: _required,
              ),
              const SizedBox(height: 12),
              _Field(
                label: 'Last Name',
                controller: _lastNameCtrl,
                validator: _required,
              ),
              const SizedBox(height: 12),
              _Field(
                label: 'Email',
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                validator: _required,
              ),
              const SizedBox(height: 12),
              _Field(
                label: 'External ID',
                controller: _externalIdCtrl,
                validator: _required,
              ),
              const SizedBox(height: 20),
              const Text(
                'Payment Methods',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: _availableMethods.map((method) {
                  final selected = _selectedMethods.contains(method);
                  return FilterChip(
                    label: Text(method),
                    selected: selected,
                    onSelected: (val) {
                      setState(() {
                        if (val) {
                          _selectedMethods.add(method);
                        } else {
                          _selectedMethods.remove(method);
                        }
                      });
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.errorContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _error!,
                      style: TextStyle(
                        color:
                            Theme.of(context).colorScheme.onErrorContainer,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              FilledButton(
                onPressed: _loading ? null : _createSession,
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Create Session & Open Checkout'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: _openBetxico,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.orange.shade800,
                  side: BorderSide(color: Colors.orange.shade400),
                ),
                child: const Text('Betxico Pay'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: _openPayframeSimulator,
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.teal.shade800,
                  side: BorderSide(color: Colors.teal.shade400),
                ),
                child: const Text('Payframe Simulator'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String? _required(String? v) =>
      (v == null || v.trim().isEmpty) ? 'Required' : null;
}

class _Field extends StatelessWidget {
  const _Field({
    required this.label,
    required this.controller,
    this.keyboardType,
    this.validator,
  });

  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
        isDense: true,
      ),
    );
  }
}

// ─── WebView screen ──────────────────────────────────────────────────────────

class CheckoutWebViewScreen extends StatefulWidget {
  const CheckoutWebViewScreen({
    super.key,
    required this.url,
    this.sessionResponse = const {},
  });

  final String url;
  final Map<String, dynamic> sessionResponse;

  @override
  State<CheckoutWebViewScreen> createState() => _CheckoutWebViewScreenState();
}

class _CheckoutWebViewScreenState extends State<CheckoutWebViewScreen> {
  late final WebViewController _controller;
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  final List<LogEntry> _logs = [];
  bool _pageLoaded = false;
  int _unreadCount = 0;

  void _addLog(LogEntry entry) {
    setState(() {
      _logs.insert(0, entry); // newest first
      _unreadCount++;
    });
    debugPrint('[${entry.typeLabel}] ${entry.title}');
  }

  String _prettyJson(dynamic value) {
    try {
      const encoder = JsonEncoder.withIndent('  ');
      return encoder.convert(value);
    } catch (_) {
      return value.toString();
    }
  }

  @override
  void initState() {
    super.initState();

    if (widget.sessionResponse.isNotEmpty) {
      _logs.add(LogEntry(
        type: LogType.response,
        time: DateTime.now(),
        title: 'Session created — ${widget.sessionResponse['id'] ?? ''}',
        body: _prettyJson(widget.sessionResponse),
      ));
      _unreadCount = 1;
    }

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'TonderEvents',
        onMessageReceived: (msg) {
          final raw = msg.message;
          dynamic parsed;
          String title = raw;
          try {
            parsed = jsonDecode(raw);
            final event = parsed['event'] as String? ?? 'message';
            title = event;
          } catch (_) {
            parsed = raw;
          }
          _addLog(LogEntry(
            type: LogType.event,
            time: DateTime.now(),
            title: title,
            body: _prettyJson(parsed),
          ));
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            setState(() => _pageLoaded = true);
            _controller.runJavaScript('''
              window.addEventListener('message', function(e) {
                if (e.data && e.data.event) {
                  TonderEvents.postMessage(JSON.stringify(e.data));
                }
              });
            ''');
          },
          onWebResourceError: (error) {
            _addLog(LogEntry(
              type: LogType.error,
              time: DateTime.now(),
              title: 'WebResourceError: ${error.description}',
              body: _prettyJson({
                'errorCode': error.errorCode,
                'errorType': error.errorType?.name,
                'description': error.description,
                'url': error.url,
              }),
            ));
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.url));
  }

  void _openDrawer() {
    setState(() => _unreadCount = 0);
    _scaffoldKey.currentState!.openEndDrawer();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        title: const Text('Checkout'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Badge(
              isLabelVisible: _unreadCount > 0,
              label: Text('$_unreadCount'),
              child: IconButton(
                icon: const Icon(Icons.bug_report_outlined),
                tooltip: 'Debug log',
                onPressed: _openDrawer,
              ),
            ),
          ),
        ],
      ),
      endDrawer: _DebugDrawer(logs: _logs),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (!_pageLoaded)
            const Center(child: CircularProgressIndicator()),
        ],
      ),
    );
  }
}

// ─── Debug drawer ────────────────────────────────────────────────────────────

class _DebugDrawer extends StatelessWidget {
  const _DebugDrawer({required this.logs});

  final List<LogEntry> logs;

  @override
  Widget build(BuildContext context) {
    return Drawer(
      width: MediaQuery.of(context).size.width * 0.88,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
              child: Row(
                children: [
                  const Icon(Icons.bug_report_outlined, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Debug Log (${logs.length})',
                    style: const TextStyle(
                        fontSize: 15, fontWeight: FontWeight.w600),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            if (logs.isEmpty)
              const Expanded(
                child: Center(
                  child: Text(
                    'No events yet',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
              )
            else
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: logs.length,
                  separatorBuilder: (_, __) =>
                      const Divider(height: 1, indent: 12, endIndent: 12),
                  itemBuilder: (context, index) {
                    return _LogEntryTile(entry: logs[index]);
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _LogEntryTile extends StatelessWidget {
  const _LogEntryTile({required this.entry});

  final LogEntry entry;

  String _formatTime(DateTime t) =>
      '${t.hour.toString().padLeft(2, '0')}:'
      '${t.minute.toString().padLeft(2, '0')}:'
      '${t.second.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
        childrenPadding: EdgeInsets.zero,
        leading: Container(
          width: 4,
          height: 40,
          decoration: BoxDecoration(
            color: entry.color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        title: Row(
          children: [
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
              decoration: BoxDecoration(
                color: entry.color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                entry.typeLabel,
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color: entry.color,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                entry.title,
                style: const TextStyle(fontSize: 13),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        subtitle: Text(
          _formatTime(entry.time),
          style: const TextStyle(fontSize: 10, color: Colors.grey),
        ),
        children: [
          Container(
            width: double.infinity,
            color: entry.bgColor,
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: SelectableText(
                    entry.body,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 11,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.copy, size: 16),
                  tooltip: 'Copy',
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: entry.body));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Copied to clipboard'),
                        duration: Duration(seconds: 1),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
