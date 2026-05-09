using WebApp.Api.Models;

namespace WebApp.Api.Tests;

/// <summary>
/// Verifies the <see cref="StreamChunk"/> factory methods and computed properties.
/// These properties determine how the SSE streaming endpoint serialises each chunk
/// and how the frontend interprets the response; regressions here would silently
/// corrupt streaming output or citations.
/// </summary>
[TestClass]
public class StreamChunkTests
{
    // ── Text factory ────────────────────────────────────────────────────────────

    [TestMethod]
    public void Text_SetsTextDelta()
    {
        var chunk = StreamChunk.Text("hello");
        Assert.AreEqual("hello", chunk.TextDelta);
    }

    [TestMethod]
    public void Text_LeavesOtherFieldsNull()
    {
        var chunk = StreamChunk.Text("hello");
        Assert.IsNull(chunk.Annotations);
        Assert.IsNull(chunk.McpApprovalRequest);
        Assert.IsNull(chunk.ToolName);
        Assert.IsFalse(chunk.IsToolUse);
    }

    [TestMethod]
    public void Text_IsText_True()
    {
        var chunk = StreamChunk.Text("hello");
        Assert.IsTrue(chunk.IsText);
    }

    [TestMethod]
    public void Text_HasAnnotations_False()
    {
        var chunk = StreamChunk.Text("hello");
        Assert.IsFalse(chunk.HasAnnotations);
    }

    [TestMethod]
    public void Text_IsMcpApprovalRequest_False()
    {
        var chunk = StreamChunk.Text("hello");
        Assert.IsFalse(chunk.IsMcpApprovalRequest);
    }

    // ── WithAnnotations factory ──────────────────────────────────────────────────

    [TestMethod]
    public void WithAnnotations_SetsAnnotations()
    {
        var annotations = new List<AnnotationInfo>
        {
            new() { Type = "uri_citation", Label = "Source 1", Url = "https://example.com" },
        };

        var chunk = StreamChunk.WithAnnotations(annotations);

        Assert.IsNotNull(chunk.Annotations);
        Assert.AreEqual(1, chunk.Annotations.Count);
        Assert.AreEqual("Source 1", chunk.Annotations[0].Label);
    }

    [TestMethod]
    public void WithAnnotations_LeavesOtherFieldsNull()
    {
        var chunk = StreamChunk.WithAnnotations(new List<AnnotationInfo>
        {
            new() { Type = "file_citation", Label = "doc.pdf" },
        });

        Assert.IsNull(chunk.TextDelta);
        Assert.IsNull(chunk.McpApprovalRequest);
        Assert.IsNull(chunk.ToolName);
        Assert.IsFalse(chunk.IsToolUse);
    }

    [TestMethod]
    public void WithAnnotations_IsText_False()
    {
        var chunk = StreamChunk.WithAnnotations(new List<AnnotationInfo>
        {
            new() { Type = "file_citation", Label = "doc.pdf" },
        });
        Assert.IsFalse(chunk.IsText);
    }

    [TestMethod]
    public void WithAnnotations_HasAnnotations_True()
    {
        var chunk = StreamChunk.WithAnnotations(new List<AnnotationInfo>
        {
            new() { Type = "uri_citation", Label = "Source" },
        });
        Assert.IsTrue(chunk.HasAnnotations);
    }

    [TestMethod]
    public void HasAnnotations_False_WhenEmptyList()
    {
        // An empty annotation list is treated as "no annotations"
        var chunk = StreamChunk.WithAnnotations(new List<AnnotationInfo>());
        Assert.IsFalse(chunk.HasAnnotations);
    }

    // ── McpApproval factory ──────────────────────────────────────────────────────

    [TestMethod]
    public void McpApproval_SetsRequest()
    {
        var request = new McpApprovalRequest
        {
            Id = "req-1",
            ToolName = "search_web",
            ServerLabel = "mcp-server",
            Arguments = "{\"query\":\"test\"}",
        };

        var chunk = StreamChunk.McpApproval(request);

        Assert.IsNotNull(chunk.McpApprovalRequest);
        Assert.AreEqual("req-1", chunk.McpApprovalRequest.Id);
        Assert.AreEqual("search_web", chunk.McpApprovalRequest.ToolName);
    }

    [TestMethod]
    public void McpApproval_LeavesOtherFieldsNull()
    {
        var chunk = StreamChunk.McpApproval(new McpApprovalRequest
        {
            Id = "req-1",
            ToolName = "tool",
            ServerLabel = "srv",
        });

        Assert.IsNull(chunk.TextDelta);
        Assert.IsNull(chunk.Annotations);
        Assert.IsNull(chunk.ToolName);
        Assert.IsFalse(chunk.IsToolUse);
    }

    [TestMethod]
    public void McpApproval_IsMcpApprovalRequest_True()
    {
        var chunk = StreamChunk.McpApproval(new McpApprovalRequest
        {
            Id = "req-1",
            ToolName = "tool",
            ServerLabel = "srv",
        });
        Assert.IsTrue(chunk.IsMcpApprovalRequest);
    }

    [TestMethod]
    public void McpApproval_IsText_False()
    {
        var chunk = StreamChunk.McpApproval(new McpApprovalRequest
        {
            Id = "req-1",
            ToolName = "tool",
            ServerLabel = "srv",
        });
        Assert.IsFalse(chunk.IsText);
    }

    // ── ToolUse factory ──────────────────────────────────────────────────────────

    [TestMethod]
    public void ToolUse_SetsIsToolUseAndToolName()
    {
        var chunk = StreamChunk.ToolUse("file_search");

        Assert.IsTrue(chunk.IsToolUse);
        Assert.AreEqual("file_search", chunk.ToolName);
    }

    [TestMethod]
    public void ToolUse_LeavesOtherFieldsNull()
    {
        var chunk = StreamChunk.ToolUse("code_interpreter");

        Assert.IsNull(chunk.TextDelta);
        Assert.IsNull(chunk.Annotations);
        Assert.IsNull(chunk.McpApprovalRequest);
    }

    [TestMethod]
    public void ToolUse_IsText_False()
    {
        var chunk = StreamChunk.ToolUse("file_search");
        Assert.IsFalse(chunk.IsText);
    }

    [TestMethod]
    public void ToolUse_HasAnnotations_False()
    {
        var chunk = StreamChunk.ToolUse("file_search");
        Assert.IsFalse(chunk.HasAnnotations);
    }

    [TestMethod]
    public void ToolUse_IsMcpApprovalRequest_False()
    {
        var chunk = StreamChunk.ToolUse("file_search");
        Assert.IsFalse(chunk.IsMcpApprovalRequest);
    }

    // ── IsText edge cases ────────────────────────────────────────────────────────

    [TestMethod]
    public void IsText_False_WhenTextDeltaIsNull()
    {
        // Default-constructed chunk has TextDelta == null
        var chunk = new StreamChunk();
        Assert.IsFalse(chunk.IsText);
    }

    [TestMethod]
    public void IsText_True_EvenForEmptyString()
    {
        // An empty string delta is still a valid text chunk (empty delta from streamer)
        var chunk = StreamChunk.Text(string.Empty);
        Assert.IsTrue(chunk.IsText);
    }
}
